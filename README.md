# Monad PoP — Monad Proof of Purchase

Monad PoP (Monad Proof of Purchase) is a merchant-issued, blockchain-verifiable digital receipt credential system built for the Monad Testnet ecosystem. It solves the real-world frustration of lost paper receipts, enabling users to prove purchases securely for returns, warranty claims, authenticity checks, and expense tracking.

## Technical Architecture

```mermaid
graph TD
    subgraph Web App (Next.js)
      A[Landing Page]
      B[Buyer Wallet]
      C[Merchant Portal]
      D[AI Assistant]
      E[Public Verification Page]
    end

    subgraph Server (Next.js API Routes)
      F[SIWE Wallet Auth]
      G[Receipt Prepare / Hashing]
      H[Receipt Confirmation / Event Sync]
      I[AI Chat Handler]
    end

    subgraph Database (SQLite & Prisma)
      J[(Receipts & Profiles)]
    end

    subgraph Blockchain (Monad Testnet)
      K[MonadPoP.sol Smart Contract]
    end

    C -->|1. Prepare Receipt Payload| G
    G -->|2. Compute Hash / Params| C
    C -->|3. Send Transaction| K
    C -->|4. Send Tx Hash & Payload| H
    H -->|5. Verify Log Event On-Chain| K
    H -->|6. Save Metadata| J
    B -->|7. View Wallet Receipts| J
    E -->|8. Public Integrity Verification| F
    F -->|9. Compare Hash On-Chain| K
    D -->|10. Ask AI with Context| I
    I -->|11. Classify & Retrieve Context| J
    I -->|12. Recalculate and Verify Hash| K
    I -->|13. Call Groq API| L[Groq Llama-3]
```

## Features

1. **Secure SIWE Authentication**: A cryptographically signed session cookie flow verifying ownership of EVM wallets using nonces.
2. **On-Chain Credentialing**: Receipts are canonicalized, hashed using Keccak256, and recorded on the Monad Testnet blockchain.
3. **Decoupled Privacy Pattern**: Heavy receipt payloads (items, SKUs, prices) are stored secure off-chain in the SQLite database, while only cryptographically secure hashes are logged on-chain.
4. **Dynamic Deadlines**: Auto-calculates and tracks return periods and warranty countdowns with visual indicators.
5. **Public Verification Pages**: Generates shareable, authentication-free public verification links and QR codes. Recalculates hashes from off-chain data and compares directly with Monad on-chain proofs.
6. **Smart AI Assistant**: Classified chat assistant powered by Groq (`llama-3.3-70b-versatile`). Checks warranties, return windows, history, and status based *only* on context retrieved from the database.
7. **Robust Admin Portal**: Allows quick testnet registration of merchants to enable role permissions for issuing receipts.

---

## Directory Structure

```
monpop/
├── contracts/               # Hardhat development suite
│   ├── contracts/
│   │   └── MonadPoP.sol     # Smart contract (AccessControl, status lifecycle)
│   ├── test/
│   │   └── MonadPoP.test.ts # Comprehensive test suite (29 tests)
│   ├── scripts/
│   │   ├── deploy.ts        # Contract deployer script
│   │   ├── grantMerchant.ts # Admin merchant registration script
│   │   └── verifyDeployment.ts # Contract state inspector
│   └── hardhat.config.ts    # Prague EVM compiler settings
│
└── web/                     # Next.js App Router front & backend
    ├── src/
    │   ├── app/             # Page layouts and API endpoints
    │   ├── components/      # React layout components (Web3Provider, Navigation)
    │   ├── hooks/           # useAuth session hook
    │   └── lib/             # Hashing, auth tokens, DB client, and Viem RPC
    ├── prisma/
    │   ├── schema.prisma    # SQLite Prisma models
    │   └── seed.ts          # 4 demo receipts seed file (Demo — not on-chain mode)
    └── tailwind.config.js   # Custom dark theme configuration
```

---

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- An injected EVM Web3 wallet (e.g., MetaMask, Rabby)
- A Groq API Key (for the AI Chat Assistant)

### 1. Smart Contract Deployment & Testing

Navigate to the `contracts/` directory:

```bash
cd contracts
npm install
```

To run the local unit test suite (29 tests checking all transition asserts, roles, and edge-cases):

```bash
npm run test
```

To compile and deploy to the Monad Testnet:
Make sure to create `contracts/.env` based on `contracts/.env.example` and set your deployer private key.

```bash
npx hardhat run scripts/deploy.ts --network monadTestnet
```

### 2. Next.js Web App Setup

Navigate to the `web/` directory:

```bash
cd ../web
npm install
```

Configure your environment variables:
Create a `web/.env.local` or copy `web/.env.local.example`.

```env
DATABASE_URL="file:./dev.db"
AUTH_SECRET="dev-secret-key-must-be-at-least-32-characters-long-for-hmac-sha256"
NEXT_PUBLIC_MONAD_RPC_URL="https://testnet-rpc.monad.xyz"
NEXT_PUBLIC_MONAD_POP_CONTRACT_ADDRESS="0x5FbDB2315678afecb367f032d93F642f64180aa3" # Set your deployed address
GROQ_API_KEY="gsk_..." # Paste your Groq API key here
```

Apply database migrations:

```bash
npx prisma migrate dev --name init
```

Seed the database with 4 demo receipts (preloaded for instant hackathon UI inspection):

```bash
npx prisma db seed
```

Start the Next.js development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## MVP Hackathon Account Configuration

For local hardhat testing or easy web app inspection, we pre-configured the following roles in our mock/seed configurations:

- **Admin Account**: `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266` (Hardhat Account #0)
- **Merchant Account**: `0x70997970C51812dc3A010C7d01b50e0d17dc79C8` (Hardhat Account #1)
- **Buyer Account**: `0x3C44Cd3B6aE100d8217431e790391365101431e7` (Hardhat Account #2)
