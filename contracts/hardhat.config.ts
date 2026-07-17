import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-verify";
import * as dotenv from "dotenv";

dotenv.config();

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.28",
    settings: {
      evmVersion: "prague",
      optimizer: {
        enabled: true,
        runs: 200,
      },
      metadata: {
        bytecodeHash: "ipfs",
      },
    },
  },
  networks: {
    hardhat: {},
    monadTestnet: {
      url:
        process.env.MONAD_TESTNET_RPC_URL ??
        "https://testnet-rpc.monad.xyz",
      accounts: process.env.DEPLOYER_PRIVATE_KEY
        ? [process.env.DEPLOYER_PRIVATE_KEY]
        : [],
      chainId: 10143,
    },
  },
  etherscan: {
    apiKey: {
      monadTestnet: process.env.ETHERSCAN_API_KEY ?? "",
    },
    customChains: [
      {
        network: "monadTestnet",
        chainId: 10143,
        urls: {
          apiURL: "https://testnet.monadscan.com/api",
          browserURL: "https://testnet.monadscan.com",
        },
      },
    ],
  },
  sourcify: {
    enabled: true,
  },
};

export default config;
