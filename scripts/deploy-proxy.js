const { upgrades } = require("hardhat");
const hre = require("hardhat");

async function main() {
  const ownerAddress = "0xE9b6a1a713282be663176ccE15Da95c588B93A96";

  const Crowdsale = await hre.ethers.getContractFactory("LandNFTCrowdsale");
  console.log("Deploying Crowdsale...");
  const crowdsale = await upgrades.deployProxy(Crowdsale, [ownerAddress], {
    initializer: "initialize",
  });

  console.log("Crowdsale deployed to:", crowdsale.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
// proxy address: 0xb6053E09fC09B2a2B4D25c33DCeB9A863038FC7e
// proxy admin address: 0xC5bb92E127547ec4bC6acA68041E7b85a89d5C02
// Implementation v1 address: 0x5Ee91bff920E47Bf54FE73cbF44973E91ae72471
