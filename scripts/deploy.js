const { upgrades } = require("hardhat");
const hre = require("hardhat");

async function main() {
  const ownerAddress = "0xE9b6a1a713282be663176ccE15Da95c588B93A96";

  const Crowdsale = await hre.ethers.getContractFactory("LandNFTCrowdsale");
  console.log("Deploying Crowdsale...");
  const crowdsale = await upgrades.deployProxy(Crowdsale, [ownerAddress], {
    initializer: "store",
  });

  console.log("Crowdsale deployed to:", crowdsale.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
// proxy address: 0xd47694e3b06C2647377552f58D4D7B23d12Bd9a7
// proxy admin address: 0xC5bb92E127547ec4bC6acA68041E7b85a89d5C02
// Implementation v1 address: 0x8067AB0A2274CdD567907A098547c6d0C4541885
