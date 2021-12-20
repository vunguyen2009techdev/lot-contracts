const { expect } = require("chai");
const { ethers } = require("hardhat");
const { Contract } = ethers;

const calculateGasCost = (gasUsed) => {
  console.log(gasUsed.toNumber());
  const gasPrice = ethers.utils.parseUnits("5", "gwei"); // average 6 gwei on bsc
  const totalInWei = gasUsed.mul(gasPrice);
  const totalUsdInWei = totalInWei.mul(500); // 1 bnb = $500
  return ethers.utils.formatEther(totalUsdInWei);
};

const buy = async (token, crowdsale, itemId, quantity) => {
  // get parcel info by parcelId
  const parcel = await crowdsale.parcels(itemId);

  // buyer has to approve the crowdsale contract to transfer the payment token
  const approve = await token.approve(
    crowdsale.address,
    BigInt(parcel.price * quantity)
  );
  await approve.wait();

  const buy = await crowdsale.buy(itemId, quantity);

  const tx = buy.wait();
  return tx;
};

describe("Sanity tests", function () {
  const cap = 23597;
  let token, decimals, buyer, owner, crowdsale, nft, simpleNFTLock;

  before(async function () {
    [buyer, owner] = await ethers.getSigners();

    // token used for payment i.e. USDT on mainnet/testnet
    const Token = await ethers.getContractFactory("StableCoin");
    token = await Token.deploy();

    // get decimals
    decimals = await token.decimals();

    // verify buyer has some coins to buy NFT
    const buyerBalance = await token.balanceOf(buyer.address);
    expect(await token.totalSupply()).to.equal(buyerBalance);

    // deploy crowdsale contract
    const Crowdsale = await ethers.getContractFactory("LandNFTCrowdsale");
    crowdsale = await Crowdsale.deploy();
    expect(await crowdsale.owner()).to.equal(owner.address);

    // verify nft deployment
    const NFT = await ethers.getContractFactory("LandNFT");
    nft = NFT.attach(await crowdsale.nft());
    expect(
      await nft.hasRole(await nft.DEFAULT_ADMIN_ROLE(), owner.address)
    ).to.be.true;

    const SimpleNFTLock = await ethers.getContractFactory("SimpleNFTLock");
    simpleNFTLock = await SimpleNFTLock.deploy(nft.address);
  });

  it("should allow to buy nft", async function () {
    const itemId = 1; // unique across tests
    const quantity = 2;
    const price = BigInt(1 * 10 ** decimals);

    // listed an item
    await crowdsale
      .connect(owner)
      .listedItem(itemId, price, token.address, cap);

    // get balance before and after buying to verify later
    const balanceOfOwnerBefore = await token.balanceOf(owner.address);

    const { logs } = await buy(token, crowdsale, itemId, quantity);

    const balanceOfOwnerAfter = await token.balanceOf(owner.address);

    // get parcel info by itemId
    const parcel = await crowdsale.parcels(itemId);

    // verify balance and price adding up correctly
    expect(balanceOfOwnerBefore.add(BigInt(parcel.price * quantity))).to.equal(
      balanceOfOwnerAfter
    );

    // retreive tokenId from the buy transaction
    let tokenIds = [];
    logs.forEach((l) => {
      const { data, topics, address } = l;
      // only care about the event emitted from the nft contract
      if (address === nft.address) {
        const { name, args } = nft.interface.parseLog({ data, topics });
        // make sure this is a mint event i.e. transfer from address(0) to buyer
        if (
          name === "Transfer" &&
          args.from === ethers.constants.AddressZero &&
          args.to === buyer.address
        ) {
          tokenIds.push(args.tokenId);
        }
      }
    });
    tokenIds.map((tokenId) => expect(tokenId).to.be.an("object"));

    // verify nft ownership
    expect(await nft.balanceOf(buyer.address)).to.equal(quantity);
    tokenIds.map(async (tokenId) =>
      expect(await nft.ownerOf(tokenId)).to.equal(buyer.address)
    );
  });

  it("should allow to lock and unlock nft", async function () {
    const itemId = 2; // unique across tests
    const quantity = 1;
    const price = BigInt(1 * 10 ** decimals);

    // listed an item
    await crowdsale
      .connect(owner)
      .listedItem(itemId, price, token.address, cap);

    await buy(token, crowdsale, itemId, quantity);

    // get first tokenId of buyer
    const tokenId = await nft.tokenOfOwnerByIndex(buyer.address, 0);

    // approve transfer
    await nft.approve(simpleNFTLock.address, tokenId);

    await expect(simpleNFTLock.lock(tokenId))
      .to.emit(simpleNFTLock, "Lock")
      .withArgs(buyer.address, tokenId);

    await expect(simpleNFTLock.unlock(tokenId))
      .to.emit(simpleNFTLock, "Unlock")
      .withArgs(buyer.address, tokenId);
  });
});
