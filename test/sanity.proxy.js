const { upgrades } = require("hardhat");
const { expect } = require("chai");

describe("Sanity (proxy)", function () {
  let buyer, owner, crowdsale, nft;

  before(async () => {
    [buyer, owner] = await ethers.getSigners();

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

    console.log("DEFAULT_ADMIN_ROLE: ", await nft.DEFAULT_ADMIN_ROLE());

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
});
