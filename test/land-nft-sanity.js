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

describe("Sanity tests", function () {
  let token, buyer, owner, crowdsale, nft;

  before(async function () {
    [buyer, owner] = await ethers.getSigners();

    // token used for payment i.e. USDT on mainnet/testnet
    const Token = await ethers.getContractFactory("StableCoin");
    token = await Token.deploy();

    // verify buyer has some coins to buy NFT
    const buyerBalance = await token.balanceOf(buyer.address);
    expect(await token.totalSupply()).to.equal(buyerBalance);

    // deploy crowdsale contract
    const Crowdsale = await ethers.getContractFactory("LandNFTCrowdsale");
    crowdsale = await Crowdsale.deploy(owner.address, token.address);
    expect(await crowdsale.owner()).to.equal(owner.address);

    // verify nft deployment
    const NFT = await ethers.getContractFactory("LandNFT");
    nft = NFT.attach(await crowdsale.nft());
    expect(
      await nft.hasRole(await nft.DEFAULT_ADMIN_ROLE(), owner.address)
    ).to.be.true;
  });

  it("should buy", async function () {
    const parcelId = 1;
    const tag = 1;

    // get parcel info by parcelId
    const parcel = await crowdsale.parcels(parcelId);

    // buyer has to approve the crowdsale contract to transfer the payment token
    const approve = await token.approve(crowdsale.address, parcel.price);
    await approve.wait();

    // get balance before and after buying to verify later
    const balanceOfOwnerBefore = await token.balanceOf(owner.address);
    const buy = await crowdsale.buy(parcelId, tag);
    const { logs } = await buy.wait();
    const balanceOfOwnerAfter = await token.balanceOf(owner.address);

    // verify balance and price adding up correctly
    expect(balanceOfOwnerBefore.add(parcel.price)).to.equal(
      balanceOfOwnerAfter
    );

    // retreive tokenId from the buy transaction
    let tokenId;
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
          tokenId = args.tokenId;
        }
      }
    });
    expect(tokenId).to.be.an("object");

    // verify nft ownership
    expect(await nft.balanceOf(buyer.address)).to.equal(1);
    expect(await nft.ownerOf(tokenId)).to.equal(buyer.address);
  });
});
