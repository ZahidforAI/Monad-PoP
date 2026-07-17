-- CreateTable
CREATE TABLE "Receipt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "chainReceiptId" TEXT NOT NULL,
    "contractAddress" TEXT NOT NULL,
    "chainId" INTEGER NOT NULL,
    "merchantAddress" TEXT NOT NULL,
    "buyerAddress" TEXT NOT NULL,
    "merchantReference" TEXT NOT NULL,
    "productIdentifier" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "sku" TEXT,
    "serialNumber" TEXT,
    "amount" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "purchasedAt" DATETIME NOT NULL,
    "returnDeadline" DATETIME,
    "warrantyUntil" DATETIME,
    "receiptJson" TEXT NOT NULL,
    "receiptHash" TEXT NOT NULL,
    "issueTxHash" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "MerchantProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "walletAddress" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "storeCode" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Receipt_chainReceiptId_key" ON "Receipt"("chainReceiptId");

-- CreateIndex
CREATE INDEX "Receipt_buyerAddress_idx" ON "Receipt"("buyerAddress");

-- CreateIndex
CREATE INDEX "Receipt_merchantAddress_idx" ON "Receipt"("merchantAddress");

-- CreateIndex
CREATE INDEX "Receipt_receiptHash_idx" ON "Receipt"("receiptHash");

-- CreateIndex
CREATE UNIQUE INDEX "MerchantProfile_walletAddress_key" ON "MerchantProfile"("walletAddress");

-- CreateIndex
CREATE UNIQUE INDEX "MerchantProfile_storeCode_key" ON "MerchantProfile"("storeCode");
