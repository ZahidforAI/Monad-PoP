import hre from "hardhat";

async function main() {
  const contractAddress = process.env.MONAD_POP_CONTRACT_ADDRESS;

  if (!contractAddress) {
    console.error("Set MONAD_POP_CONTRACT_ADDRESS env variable.");
    process.exit(1);
  }

  console.log("Verifying MonadPoP deployment...\n");

  const MonadPoP = await hre.ethers.getContractAt("MonadPoP", contractAddress);

  const DEFAULT_ADMIN_ROLE = await MonadPoP.DEFAULT_ADMIN_ROLE();
  const MERCHANT_ROLE = await MonadPoP.MERCHANT_ROLE();
  const nextId = await MonadPoP.nextReceiptId();
  const chainId = (await hre.ethers.provider.getNetwork()).chainId;

  console.log("=".repeat(60));
  console.log("MonadPoP Deployment State");
  console.log("=".repeat(60));
  console.log("Network:            ", hre.network.name);
  console.log("Chain ID:           ", chainId.toString());
  console.log("Contract Address:   ", contractAddress);
  console.log("DEFAULT_ADMIN_ROLE: ", DEFAULT_ADMIN_ROLE);
  console.log("MERCHANT_ROLE:      ", MERCHANT_ROLE);
  console.log("Next Receipt ID:    ", nextId.toString());
  console.log(
    "Total Receipts:     ",
    (nextId - BigInt(1)).toString()
  );
  console.log("=".repeat(60));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
