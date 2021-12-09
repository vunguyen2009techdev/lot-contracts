const hre = require("hardhat");

async function main() {
  // Mr.An's address
  const ownerAddress = "0x8f1e3e97111167fe1aec5085a5877c84b8c9420c";
  const Crowdsale = await hre.ethers.getContractFactory(
    "LandNFTCrowdsaleSignature"
  );
  const crowdsale = await Crowdsale.deploy(ownerAddress);
  console.log("Deployed to:", crowdsale.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
