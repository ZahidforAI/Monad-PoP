import hre from "hardhat";

async function main() {
  const merchantAddress = process.env.MERCHANT_ADDRESS;

  if (!merchantAddress) {
    console.error(
      "Set MERCHANT_ADDRESS env variable.\n" +
        "Usage: MERCHANT_ADDRESS=0x... npx hardhat run scripts/grantMerchant.ts --network monadTestnet"
    );
    process.exit(1);
  }

  const contractAddress = process.env.MONAD_POP_CONTRACT_ADDRESS;

  if (!contractAddress) {
    console.error("Set MONAD_POP_CONTRACT_ADDRESS env variable.");
    process.exit(1);
  }

  const MonadPoP = await hre.ethers.getContractAt("MonadPoP", contractAddress);
  const MERCHANT_ROLE = await MonadPoP.MERCHANT_ROLE();

  const hasBefore = await MonadPoP.hasRole(MERCHANT_ROLE, merchantAddress);
  if (hasBefore) {
    console.log(`Address ${merchantAddress} already has MERCHANT_ROLE.`);
    return;
  }

  console.log(`Granting MERCHANT_ROLE to ${merchantAddress}...`);
  const tx = await MonadPoP.grantRole(MERCHANT_ROLE, merchantAddress);
  const receipt = await tx.wait();

  console.log("Transaction hash:", receipt?.hash);
  console.log(
    "Explorer:",
    `https://testnet.monadvision.com/tx/${receipt?.hash}`
  );

  const hasAfter = await MonadPoP.hasRole(MERCHANT_ROLE, merchantAddress);
  console.log(`MERCHANT_ROLE granted: ${hasAfter}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
