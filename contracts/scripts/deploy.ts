import hre from "hardhat";

async function main() {
  console.log("Deploying MonadPoP to", hre.network.name, "...\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer address:", deployer.address);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Deployer balance:", hre.ethers.formatEther(balance), "MON\n");

  const MonadPoP = await hre.ethers.getContractFactory("MonadPoP");
  const contract = await MonadPoP.deploy();
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  const deployTx = contract.deploymentTransaction();
  const chainId = (await hre.ethers.provider.getNetwork()).chainId;

  console.log("=".repeat(60));
  console.log("MonadPoP Deployment Summary");
  console.log("=".repeat(60));
  console.log("Network:          ", hre.network.name);
  console.log("Chain ID:         ", chainId.toString());
  console.log("Contract Address: ", address);
  console.log("Deployer Address: ", deployer.address);
  console.log("Transaction Hash: ", deployTx?.hash);
  console.log(
    "Explorer Link:    ",
    `https://testnet.monadvision.com/tx/${deployTx?.hash}`
  );
  console.log("=".repeat(60));
  console.log("\nCopy this into your web/.env.local:\n");
  console.log(`NEXT_PUBLIC_MONAD_POP_CONTRACT_ADDRESS=${address}`);
  console.log("");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
