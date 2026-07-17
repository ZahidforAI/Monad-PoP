import { PrismaClient } from "@prisma/client";
import crypto from "crypto";
import { keccak256, stringToBytes } from "viem";

const prisma = new PrismaClient();
const ALGORITHM = "aes-256-gcm";

function getDevEncryptionKey(): Buffer {
  const rawKey = process.env.DATA_ENCRYPTION_KEY ?? "dev-default-encryption-key-32bytes";
  return crypto.createHash("sha256").update(rawKey).digest();
}

function encrypt(plaintext: string) {
  const key = getDevEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let ciphertext = cipher.update(plaintext, "utf8", "hex");
  ciphertext += cipher.final("hex");
  
  const tag = cipher.getAuthTag().toString("hex");
  return {
    ciphertext,
    iv: iv.toString("hex"),
    tag: tag,
  };
}

async function main() {
  console.log("Seeding Monad PoP Redesigned Database...");

  // Clean existing tables
  await prisma.privatePassportData.deleteMany({});
  await prisma.listing.deleteMany({});
  await prisma.productPassport.deleteMany({});
  await prisma.merchantProfile.deleteMany({});

  // 1. Seed Merchant Profile
  const merchant = await prisma.merchantProfile.create({
    data: {
      walletAddress: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", // Hardhat Account #0
      displayName: "Aura Premium Goods",
      storeCode: "AURA-STORE-01",
    },
  });
  console.log("Seeded Merchant Profile:", merchant.displayName);

  const now = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const warrantyExpiry = new Date();
  warrantyExpiry.setDate(warrantyExpiry.getDate() + 335); // 1 year from 30 days ago

  // 2. Seed Product Passport #1: Headphones Pro (owned by Account #1, listed for sale)
  const headphonesReceipt = {
    schemaVersion: "1.0",
    merchantReference: "REF-AURA-HP-001",
    buyerWallet: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    product: {
      productIdentifier: "prod-aura-headphones",
      sku: "SKU-AURA-ANC-BLK",
      serialNumber: "SN-AURA-77382-X",
      displayName: "Aura Headphones Pro",
    },
    purchase: {
      purchasedAt: thirtyDaysAgo.toISOString(),
      currency: "MON",
      amount: "250.0",
    },
  };

  const headphonesReceiptString = JSON.stringify(headphonesReceipt);
  const headphonesHash = keccak256(stringToBytes(headphonesReceiptString));

  const passport1 = await prisma.productPassport.create({
    data: {
      chainPassportId: 1,
      contractAddress: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
      chainId: 10143,
      productId: keccak256(stringToBytes("prod-aura-headphones")),
      originalReceiptHash: headphonesHash,
      merchantAddress: merchant.walletAddress,
      originalBuyerAddress: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8", // Account #1
      currentOwnerAddress: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",  // Account #1
      purchasedAt: thirtyDaysAgo,
      warrantyUntil: warrantyExpiry,
      status: "Active",
      
      productName: "Aura Headphones Pro",
      brand: "Aura",
      model: "ANC Pro Black",
      imageUrl: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&auto=format&fit=crop&q=60",
      description: "Premium noise-cancelling headphones featuring advanced active hybrid ANC, custom tuned acoustic design, and 40 hour battery life.",
      merchantName: merchant.displayName,
      metadataHash: keccak256(stringToBytes("Aura Headphones Pro Public Metadata")),
      issueTxHash: "0xd029c78d4615a1be82496a798157790b8f36c53cd47895e69bfdbd40134f590d",
    },
  });

  const encryptedPrivate1 = encrypt(JSON.stringify({
    serialNumber: "SN-AURA-77382-X",
    sku: "SKU-AURA-ANC-BLK",
    merchantReference: "REF-AURA-HP-001",
    receiptJson: headphonesReceiptString,
    privateBuyerInfo: "John Doe, john@example.com",
    privateNotes: "Customer requested standard delivery, shipped via Monad Express.",
    warrantyDocs: "1-year limited warranty card included."
  }));

  await prisma.privatePassportData.create({
    data: {
      passportId: passport1.chainPassportId,
      encryptedPayload: encryptedPrivate1.ciphertext,
      iv: encryptedPrivate1.iv,
      tag: encryptedPrivate1.tag,
    },
  });
  console.log("Seeded Product Passport #1 & Encrypted Metadata");

  // 3. Seed Active Listing for Passport #1
  const listing1 = await prisma.listing.create({
    data: {
      chainListingId: 1,
      passportId: passport1.chainPassportId,
      sellerAddress: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
      price: "15000000000000000000", // 15 MON in wei
      metadataHash: keccak256(stringToBytes("Listing 1 Metadata")),
      status: "Active",
      escrowStatus: "None",
      createTxHash: "0xa1b2c3d4e5f6g7h8i9j0",
    },
  });
  console.log("Seeded Active Listing for Passport #1 at 15 MON");

  // 4. Seed Product Passport #2: Aura Watch Chronograph (sold from Account #1 to Account #2)
  const watchReceipt = {
    schemaVersion: "1.0",
    merchantReference: "REF-AURA-W-002",
    buyerWallet: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    product: {
      productIdentifier: "prod-aura-watch",
      sku: "SKU-AURA-CHRONO",
      serialNumber: "SN-AURA-88271-W",
      displayName: "Aura Watch Chronograph",
    },
    purchase: {
      purchasedAt: thirtyDaysAgo.toISOString(),
      currency: "MON",
      amount: "850.0",
    },
  };

  const watchReceiptString = JSON.stringify(watchReceipt);
  const watchHash = keccak256(stringToBytes(watchReceiptString));

  const passport2 = await prisma.productPassport.create({
    data: {
      chainPassportId: 2,
      contractAddress: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
      chainId: 10143,
      productId: keccak256(stringToBytes("prod-aura-watch")),
      originalReceiptHash: watchHash,
      merchantAddress: merchant.walletAddress,
      originalBuyerAddress: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8", // Account #1
      currentOwnerAddress: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",  // Account #2 (Buyer)
      purchasedAt: thirtyDaysAgo,
      warrantyUntil: warrantyExpiry,
      status: "Active",
      
      productName: "Aura Watch Chronograph",
      brand: "Aura",
      model: "Chronograph Edition",
      imageUrl: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&auto=format&fit=crop&q=60",
      description: "Sophisticated analog timepiece with ceramic bezel, scratch-resistant sapphire crystal lens, and precise quartz movements.",
      merchantName: merchant.displayName,
      metadataHash: keccak256(stringToBytes("Aura Watch Public Metadata")),
      issueTxHash: "0x11223344556677889900",
    },
  });

  const encryptedPrivate2 = encrypt(JSON.stringify({
    serialNumber: "SN-AURA-88271-W",
    sku: "SKU-AURA-CHRONO",
    merchantReference: "REF-AURA-W-002",
    receiptJson: watchReceiptString,
    privateBuyerInfo: "John Doe, john@example.com",
    privateNotes: "Customer purchased in-store, requested gift wrapping.",
    warrantyDocs: "3-year premium extended warranty certificate."
  }));

  await prisma.privatePassportData.create({
    data: {
      passportId: passport2.chainPassportId,
      encryptedPayload: encryptedPrivate2.ciphertext,
      iv: encryptedPrivate2.iv,
      tag: encryptedPrivate2.tag,
    },
  });

  // Seed Completed Listing for Passport #2
  const completedListing = await prisma.listing.create({
    data: {
      chainListingId: 2,
      passportId: passport2.chainPassportId,
      sellerAddress: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8", // Account #1
      buyerAddress: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",  // Account #2
      price: "50000000000000000000", // 50 MON in wei
      metadataHash: keccak256(stringToBytes("Listing 2 Metadata")),
      saleProofHash: keccak256(stringToBytes("Simulated Sale Proof Hash for Listing 2")),
      status: "Completed",
      escrowStatus: "Settled",
      createTxHash: "0xb2c3d4e5f6g7h8i9j0k1",
      actionTxHash: "0xc3d4e5f6g7h8i9j0k1l2",
      acceptedAt: new Date(Date.now() - 3600 * 1000 * 2), // 2 hours ago
      completedAt: new Date(Date.now() - 3600 * 1000 * 1), // 1 hour ago
    },
  });
  console.log("Seeded Completed Listing & Transfer history for Passport #2");

  console.log("Database seeded successfully.");
}

main()
  .catch((e) => {
    console.error("Seeding error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
