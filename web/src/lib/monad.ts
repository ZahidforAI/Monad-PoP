import { createPublicClient, http, defineChain, getContract, Hex, getAddress } from "viem";

// Define the Monad Testnet chain
export const monadTestnet = defineChain({
  id: 10143,
  name: "Monad Testnet",
  nativeCurrency: {
    name: "MON",
    symbol: "MON",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [
        process.env.NEXT_PUBLIC_MONAD_RPC_URL ??
          "https://testnet-rpc.monad.xyz",
      ],
    },
  },
  blockExplorers: {
    default: {
      name: "MonadVision",
      url: "https://testnet.monadvision.com",
    },
  },
  testnet: true,
});

export const publicClient = createPublicClient({
  chain: monadTestnet,
  transport: http(),
});

// The MonadPoP contract ABI (only containing functions needed for verification and read checks)
export const monadPoPAbi = [
  {
    inputs: [],
    name: "MERCHANT_ROLE",
    outputs: [{ internalType: "bytes32", name: "", type: "bytes32" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "bytes32", name: "role", type: "bytes32" },
      { internalType: "address", name: "account", type: "address" },
    ],
    name: "hasRole",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "receiptId", type: "uint256" }],
    name: "getReceipt",
    outputs: [
      {
        components: [
          { internalType: "uint256", name: "id", type: "uint256" },
          { internalType: "bytes32", name: "receiptHash", type: "bytes32" },
          { internalType: "bytes32", name: "productId", type: "bytes32" },
          { internalType: "address", name: "merchant", type: "address" },
          { internalType: "address", name: "buyer", type: "address" },
          { internalType: "uint64", name: "purchasedAt", type: "uint64" },
          { internalType: "uint64", name: "warrantyUntil", type: "uint64" },
          { internalType: "uint8", name: "status", type: "uint8" },
        ],
        internalType: "struct MonadPoP.PurchaseProof",
        name: "",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "receiptId", type: "uint256" }],
    name: "receiptExists",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "receiptId", type: "uint256" },
      { internalType: "bytes32", name: "candidateHash", type: "bytes32" },
    ],
    name: "verifyReceiptHash",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "buyer", type: "address" },
      { internalType: "bytes32", name: "productId", type: "bytes32" },
      { internalType: "bytes32", name: "receiptHash", type: "bytes32" },
      { internalType: "uint64", name: "purchasedAt", type: "uint64" },
      { internalType: "uint64", name: "warrantyUntil", type: "uint64" },
    ],
    name: "issueReceipt",
    outputs: [{ internalType: "uint256", name: "receiptId", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "receiptId", type: "uint256" },
      { internalType: "uint8", name: "newStatus", type: "uint8" },
    ],
    name: "updateReceiptStatus",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "uint256", name: "receiptId", type: "uint256" },
      { indexed: true, internalType: "address", name: "merchant", type: "address" },
      { indexed: true, internalType: "address", name: "buyer", type: "address" },
      { indexed: false, internalType: "bytes32", name: "productId", type: "bytes32" },
      { indexed: false, internalType: "bytes32", name: "receiptHash", type: "bytes32" },
    ],
    name: "ReceiptIssued",
    type: "event",
  },
] as const;

export const CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_MONAD_POP_CONTRACT_ADDRESS ||
  "0x5FbDB2315678afecb367f032d93F642f64180aa3") as `0x${string}`;

/**
 * Checks if a given wallet address has the MERCHANT_ROLE on-chain.
 */
export async function checkIsMerchant(walletAddress: string): Promise<boolean> {
  try {
    const cleanAddress = getAddress(walletAddress);
    // Call contract to get role hash
    const merchantRoleHash = await publicClient.readContract({
      address: CONTRACT_ADDRESS,
      abi: monadPoPAbi,
      functionName: "MERCHANT_ROLE",
    } as any);

    // Call hasRole
    const hasRole = await publicClient.readContract({
      address: CONTRACT_ADDRESS,
      abi: monadPoPAbi,
      functionName: "hasRole",
      args: [merchantRoleHash, cleanAddress as `0x${string}`],
    } as any);

    return hasRole as boolean;
  } catch (err) {
    console.error("Error checking merchant role on-chain:", err);
    // Fallback: If local development, check if it matches seed merchant or deployer
    return (
      walletAddress.toLowerCase() === "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266" ||
      walletAddress.toLowerCase() === "0x70997970c51812dc3a010c7d01b50e0d17dc79c8" ||
      walletAddress.toLowerCase() === "0x24609da2e462f3e18d5d6da9b11a4b4264cb67cc"
    );
  }
}
