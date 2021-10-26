const hre = require("hardhat");

async function main() {
  // tam's address
  const ownerAddress = "0xF0219788842a23e971072Cc16420b67C3A68D9CB";
  // faucet https://testnet.binance.org/faucet-smart
  const usdtAddress = "0x337610d27c682E347C9cD60BD4b3b107C9d34dDd";
  const Crowdsale = await hre.ethers.getContractFactory("LandNFTCrowdsale");
  const crowdsale = await Crowdsale.deploy(ownerAddress, usdtAddress);
  console.log("Deployed to:", crowdsale.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
