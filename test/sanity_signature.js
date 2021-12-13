const { expect } = require("chai");
const { ethers } = require("hardhat");
require("dotenv").config();

function randomdInteger(min = 0, max = 1 * 10 ** 18) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const buy = async (
  token,
  owner,
  crowdsale,
  itemId,
  buyerAddress,
  quantity,
  price,
  priceApprove,
  signature,
  salt
) => {
  const approve = await token.approve(crowdsale.address, BigInt(priceApprove));
  await approve.wait();

  const buy = await crowdsale
    .connect(owner)
    .buy(itemId, buyerAddress, quantity, price, token.address, signature, salt);

  const tx = buy.wait();
  return tx;
};

describe("Sanity tests", function () {
  let buyer, owner, token, decimals, nft;

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
    const Crowdsale = await ethers.getContractFactory(
      "LandNFTCrowdsaleSignature"
    );
    crowdsale = await Crowdsale.deploy(owner.address);
    expect(await crowdsale.owner()).to.equal(owner.address);

    // verify nft deployment
    const NFT = await ethers.getContractFactory("LandNFT");
    nft = NFT.attach(await crowdsale.nft());
    expect(
      await nft.hasRole(await nft.DEFAULT_ADMIN_ROLE(), owner.address)
    ).to.be.true;
  });

  it("should allow to buy nft", async function () {
    const itemId = 1;
    const quantity = 2;
    const rawPrice = 1;
    const price = BigInt(rawPrice * 10 ** decimals);
    const priceApprove = BigInt(rawPrice * quantity * 10 ** decimals);
    const salt = BigInt(randomdInteger());
    const privateKey = process.env.PRIVATE_KEY_SIGN;

    const wallet = new ethers.Wallet(privateKey);

    const messageHash = await ethers.utils.solidityKeccak256(
      ["uint256", "address", "uint256", "uint256", "address", "uint256"],
      [itemId, buyer.address, quantity, price, token.address, salt]
    );
    const messageHashBytes = ethers.utils.arrayify(messageHash);
    const signature = await wallet.signMessage(messageHashBytes);

    // get balance before and after buying to verify later
    const balanceOfOwnerBefore = await token.balanceOf(owner.address);

    // buy an item
    const { logs } = await buy(
      token,
      owner,
      crowdsale,
      itemId,
      buyer.address,
      quantity,
      price,
      priceApprove,
      signature,
      salt
    );

    const balanceOfOwnerAfter = await token.balanceOf(owner.address);

    // verify balance and price adding up correctly
    expect(balanceOfOwnerBefore.add(priceApprove)).to.equal(
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
});
