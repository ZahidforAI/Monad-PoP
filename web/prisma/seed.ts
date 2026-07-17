import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding Monad PoP database with demo data...");

  // Clean existing data
  await prisma.receipt.deleteMany({});
  await prisma.merchantProfile.deleteMany({});

  // 1. Create a merchant profile
  const merchant = await prisma.merchantProfile.create({
    data: {
      walletAddress: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", // Hardhat Account #0
      displayName: "Monad MegaStore",
      storeCode: "MMS-001",
    },
  });
  console.log("Seeded Merchant Profile:", merchant.displayName);

  const now = new Date();
  
  // Helper for date offsets
  const daysOffset = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d;
  };

  // Helper for hours offset
  const hoursOffset = (hours: number) => {
    const d = new Date();
    d.setHours(d.getHours() + hours);
    return d;
  };

  // 2. Active shirt receipt (eligible for return, no warranty)
  const shirtPayload = {
    schemaVersion: "1.0",
    merchantReference: "REF-SHIRT-001",
    buyerWallet: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8", // Hardhat Account #1
    product: {
      productIdentifier: "prod-shirt-black",
      sku: "SKU-SHIRT-BLK-M",
      serialNumber: "SN-SHIRT-99182",
      displayName: "Monad Premium Black Tee",
    },
    purchase: {
      purchasedAt: now.toISOString(),
      currency: "MON",
      amount: "15.0",
      returnDeadline: daysOffset(14).toISOString(),
    },
  };

  await prisma.receipt.create({
    data: {
      chainReceiptId: "9001", // Demo range
      contractAddress: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
      chainId: 10143,
      merchantAddress: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
      buyerAddress: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
      merchantReference: "REF-SHIRT-001",
      productIdentifier: "prod-shirt-black",
      productName: "Monad Premium Black Tee",
      sku: "SKU-SHIRT-BLK-M",
      serialNumber: "SN-SHIRT-99182",
      amount: "15.0",
      currency: "MON",
      purchasedAt: now,
      returnDeadline: daysOffset(14),
      receiptJson: JSON.stringify(shirtPayload),
      receiptHash: "0xd029c78d4615a1be82496a798157790b8f36c53cd47895e69bfdbd40134f590d",
      issueTxHash: "demo-tx-hash-shirt",
      status: "Active",
    },
  });

  // 3. Laptop receipt with active warranty (return expired)
  const laptopPayload = {
    schemaVersion: "1.0",
    merchantReference: "REF-LAPTOP-002",
    buyerWallet: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    product: {
      productIdentifier: "prod-laptop-m3",
      sku: "SKU-LAP-M3-16",
      serialNumber: "SN-LAP-M3-88271",
      displayName: "Supercharged Developer Laptop M3",
    },
    purchase: {
      purchasedAt: daysOffset(-30).toISOString(),
      currency: "MON",
      amount: "1500.0",
      returnDeadline: daysOffset(-16).toISOString(),
      warrantyUntil: daysOffset(335).toISOString(),
    },
  };

  await prisma.receipt.create({
    data: {
      chainReceiptId: "9002",
      contractAddress: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
      chainId: 10143,
      merchantAddress: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
      buyerAddress: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
      merchantReference: "REF-LAPTOP-002",
      productIdentifier: "prod-laptop-m3",
      productName: "Supercharged Developer Laptop M3",
      sku: "SKU-LAP-M3-16",
      serialNumber: "SN-LAP-M3-88271",
      amount: "1500.0",
      currency: "MON",
      purchasedAt: daysOffset(-30),
      returnDeadline: daysOffset(-16),
      warrantyUntil: daysOffset(335),
      receiptJson: JSON.stringify(laptopPayload),
      receiptHash: "0xc8827a5dbe8c89c8a9829283f3e1aef912061234a9bfe89021235123abcd5823",
      issueTxHash: "demo-tx-hash-laptop",
      status: "Active",
    },
  });

  // 4. Headphones receipt close to return deadline (12 hours remaining)
  const audioPayload = {
    schemaVersion: "1.0",
    merchantReference: "REF-AUDIO-003",
    buyerWallet: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    product: {
      productIdentifier: "prod-audio-pro",
      sku: "SKU-AUD-ANC-01",
      serialNumber: "SN-AUD-77218",
      displayName: "Monad ANC Pro Headphones",
    },
    purchase: {
      purchasedAt: daysOffset(-13.5).toISOString(),
      currency: "MON",
      amount: "250.0",
      returnDeadline: hoursOffset(12).toISOString(),
      warrantyUntil: daysOffset(351.5).toISOString(),
    },
  };

  await prisma.receipt.create({
    data: {
      chainReceiptId: "9003",
      contractAddress: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
      chainId: 10143,
      merchantAddress: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
      buyerAddress: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
      merchantReference: "REF-AUDIO-003",
      productIdentifier: "prod-audio-pro",
      productName: "Monad ANC Pro Headphones",
      sku: "SKU-AUD-ANC-01",
      serialNumber: "SN-AUD-77218",
      amount: "250.0",
      currency: "MON",
      purchasedAt: daysOffset(-13.5),
      returnDeadline: hoursOffset(12),
      warrantyUntil: daysOffset(351.5),
      receiptJson: JSON.stringify(audioPayload),
      receiptHash: "0x289acbe123891abcd34827dbe1023aef893273461234abcd56789123fe56ab8d",
      issueTxHash: "demo-tx-hash-audio",
      status: "Active",
    },
  });

  // 5. Returned shirt receipt
  const returnedShirtPayload = {
    schemaVersion: "1.0",
    merchantReference: "REF-SHIRT-004",
    buyerWallet: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    product: {
      productIdentifier: "prod-shirt-white",
      sku: "SKU-SHIRT-WHT-L",
      serialNumber: "SN-SHIRT-11234",
      displayName: "Monad Classic White Shirt",
    },
    purchase: {
      purchasedAt: daysOffset(-10).toISOString(),
      currency: "MON",
      amount: "12.0",
      returnDeadline: daysOffset(4).toISOString(),
    },
  };

  await prisma.receipt.create({
    data: {
      chainReceiptId: "9004",
      contractAddress: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
      chainId: 10143,
      merchantAddress: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
      buyerAddress: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
      merchantReference: "REF-SHIRT-004",
      productIdentifier: "prod-shirt-white",
      productName: "Monad Classic White Shirt",
      sku: "SKU-SHIRT-WHT-L",
      serialNumber: "SN-SHIRT-11234",
      amount: "12.0",
      currency: "MON",
      purchasedAt: daysOffset(-10),
      returnDeadline: daysOffset(4),
      receiptJson: JSON.stringify(returnedShirtPayload),
      receiptHash: "0x38291abcd567823f99018274cdbe9201f829c91abcd34827dbe1023aef89327a",
      issueTxHash: "demo-tx-hash-returned",
      status: "Returned",
    },
  });

  console.log("Database seeded successfully with 4 demo receipts.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
