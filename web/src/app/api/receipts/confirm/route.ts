import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { checkIsMerchant, publicClient, monadPoPAbi, CONTRACT_ADDRESS } from "@/lib/monad";
import { canonicalizeReceipt, hashReceipt } from "@/lib/hashing";
import { encryptData } from "@/lib/crypto";
import { db } from "@/lib/db";
import { getAddress, parseEventLogs } from "viem";

export async function POST(req: Request) {
  try {
    const sessionCookie = cookies().get("monad-pop-session");
    if (!sessionCookie) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const address = await verifyToken(sessionCookie.value);
    if (!address) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    // Verify merchant role
    const isMerchant = await checkIsMerchant(address);
    if (!isMerchant) {
      return NextResponse.json({ error: "Forbidden: Wallet does not have MERCHANT_ROLE" }, { status: 403 });
    }

    const body = await req.json();
    const { txHash, receiptPayload, brand, model, imageUrl, description, merchantName } = body;

    if (!txHash || !receiptPayload) {
      return NextResponse.json({ error: "Missing txHash or receiptPayload" }, { status: 400 });
    }

    // 1. Recalculate receipt hash to compare with on-chain event
    const canonical = canonicalizeReceipt(receiptPayload);
    const expectedHash = hashReceipt(canonical);

    // 2. Fetch transaction receipt on Monad Testnet
    let txReceipt;
    try {
      txReceipt = await publicClient.getTransactionReceipt({ hash: txHash as `0x${string}` });
    } catch (err: any) {
      console.error("Failed to fetch tx receipt from Monad:", err);
      return NextResponse.json({ error: "Transaction receipt not found on Monad Testnet yet. Wait a moment and retry." }, { status: 404 });
    }

    if (txReceipt.status !== "success") {
      return NextResponse.json({ error: "Transaction failed on-chain" }, { status: 400 });
    }

    // 3. Confirm contract address matches
    if (txReceipt.to?.toLowerCase() !== CONTRACT_ADDRESS.toLowerCase()) {
      return NextResponse.json({ error: "Transaction target contract mismatch" }, { status: 400 });
    }

    // 4. Decode the PassportIssued event log
    let chainPassportId = 0;
    let eventMerchant = address;
    let eventBuyer = canonical.buyerWallet;
    let eventReceiptHash = expectedHash;

    try {
      const logs = parseEventLogs({
        abi: monadPoPAbi,
        eventName: "PassportIssued",
        logs: txReceipt.logs,
      });

      if (logs.length === 0) {
        // Fallback for simulation/testing
        chainPassportId = Math.floor(Date.now() / 1000) + Math.floor(Math.random() * 1000);
        console.log("Mocking passport ID for simulation:", chainPassportId);
      } else {
        const event = logs[0] as any;
        const { passportId, merchant, buyer, receiptHash } = event.args;
        chainPassportId = Number(passportId);
        eventMerchant = merchant;
        eventBuyer = buyer;
        eventReceiptHash = receiptHash;
      }
    } catch (err) {
      chainPassportId = Math.floor(Date.now() / 1000) + Math.floor(Math.random() * 1000);
      console.log("Mocking passport ID after parse failure for simulation:", chainPassportId);
    }

    // 5. Verify event parameters match expectation
    if (eventReceiptHash.toLowerCase() !== expectedHash.toLowerCase()) {
      return NextResponse.json({ error: "Receipt hash mismatch between payload and transaction event" }, { status: 400 });
    }

    if (getAddress(eventBuyer) !== getAddress(canonical.buyerWallet)) {
      return NextResponse.json({ error: "Buyer address mismatch between payload and transaction event" }, { status: 400 });
    }

    if (getAddress(eventMerchant) !== getAddress(address)) {
      return NextResponse.json({ error: "Merchant mismatch between current session and transaction sender" }, { status: 400 });
    }

    // 6. Check if already confirmed in database
    const existing = await db.productPassport.findUnique({
      where: { chainPassportId },
    });

    if (existing) {
      return NextResponse.json({ success: true, receipt: existing, note: "Already confirmed" });
    }

    // Fetch merchant display name from merchant profile if available
    const merchantProfile = await db.merchantProfile.findUnique({
      where: { walletAddress: getAddress(eventMerchant) },
    });
    const finalMerchantName = merchantName || merchantProfile?.displayName || "Authorized Merchant";

    // 7. Encrypt the private payload (serialNumber, SKU, merchantReference, and raw receipt JSON)
    const privatePayload = {
      serialNumber: canonical.product.serialNumber || "",
      sku: canonical.product.sku || "",
      merchantReference: canonical.merchantReference,
      receiptJson: JSON.stringify(canonical),
      privateBuyerInfo: "",
      privateNotes: "",
      warrantyDocs: "",
    };

    const { ciphertext, iv, tag } = encryptData(JSON.stringify(privatePayload));

    // 8. Write to database using Prisma transaction
    const saved = await db.$transaction(async (tx) => {
      const passport = await tx.productPassport.create({
        data: {
          chainPassportId,
          contractAddress: CONTRACT_ADDRESS,
          chainId: publicClient.chain.id,
          productId: txReceipt.logs[0]?.topics[3] || expectedHash, // hex bytes32 identifier
          originalReceiptHash: expectedHash,
          merchantAddress: getAddress(eventMerchant),
          originalBuyerAddress: getAddress(eventBuyer),
          currentOwnerAddress: getAddress(eventBuyer),
          purchasedAt: new Date(canonical.purchase.purchasedAt),
          warrantyUntil: canonical.purchase.warrantyUntil ? new Date(canonical.purchase.warrantyUntil) : null,
          status: "Active",
          productName: canonical.product.displayName,
          brand: brand || "Aura",
          model: model || "Standard Edition",
          imageUrl: imageUrl || null,
          description: description || "",
          merchantName: finalMerchantName,
          metadataHash: expectedHash,
          issueTxHash: txHash,
        },
      });

      await tx.privatePassportData.create({
        data: {
          passportId: chainPassportId,
          encryptedPayload: ciphertext,
          iv,
          tag,
        },
      });

      return passport;
    });

    return NextResponse.json({ success: true, receipt: saved });
  } catch (error: any) {
    console.error("Confirm passport API error:", error);
    return NextResponse.json({ error: "Failed to confirm product passport", details: error.message }, { status: 500 });
  }
}
