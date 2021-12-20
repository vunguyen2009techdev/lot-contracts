const { upgrades } = require("hardhat");
const { expect } = require("chai");

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

describe("Sanity (proxy)", function () {
  const cap = 23597;
  let token, decimals, buyer, owner, crowdsale, nft;

  before(async () => {
    [buyer, owner] = await ethers.getSigners();

    // token used for payment i.e. USDT on mainnet/testnet
    const Token = await ethers.getContractFactory("StableCoin");
    token = await Token.deploy();

    // get decimals
    decimals = await token.decimals();

    const NFT = await ethers.getContractFactory("LandNFT");
    nft = await upgrades.deployProxy(
      NFT,
      ["Land NFT", "LLOT", "https://api.landoftitans.net/nft/land/"],
      {
        initializer: "initialize",
      }
    );
    await nft.deployed();

    console.log("NFT proxy deployed to:", nft.address);
    console.log("- name: ", await nft.name());
    console.log("- symbol: ", await nft.symbol());
    await nft.grantRole(nft.DEFAULT_ADMIN_ROLE(), owner.address);

    expect(await nft.hasRole(await nft.DEFAULT_ADMIN_ROLE(), owner.address)).to
      .be.true;

    const Crowdsale = await ethers.getContractFactory("LandNFTCrowdsale");
    crowdsale = await upgrades.deployProxy(
      Crowdsale,
      [owner.address, nft.address],
      {
        initializer: "initialize",
      }
    );

    await crowdsale.deployed();
  });

  it("retrieve returns previously initialized", async function () {
    console.log("Crowdsale proxy deployed to:", crowdsale.address);
    const getOwner = await crowdsale.owner();
    console.log("getOwner", getOwner);
  });

  it("should allow to buy nft", async function () {
    const itemId = 1; // unique across tests
    const quantity = 2;
    const price = BigInt(1 * 10 ** decimals);

    // listed an item
    await crowdsale
      .connect(owner)
      .listedItem(itemId, price, token.address, cap);

    // grantRole minter
    await nft.grantRole(nft.MINTER_ROLE(), buyer.address);
    console.log(
      "check: ",
      await nft.hasRole(await nft.MINTER_ROLE(), buyer.address)
    );
    expect(await nft.hasRole(await nft.MINTER_ROLE(), buyer.address)).to.be
      .true;

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
    console.log("tokenIds: ", tokenIds);

    // tokenIds.map((tokenId) => expect(tokenId).to.be.an("object"));

    // verify nft ownership
    // expect(await nft.balanceOf(buyer.address)).to.equal(quantity);
    // tokenIds.map(async (tokenId) =>
    //   expect(await nft.ownerOf(tokenId)).to.equal(buyer.address)
    // );
  });
});
