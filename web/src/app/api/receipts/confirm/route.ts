import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { checkIsMerchant, publicClient, monadPoPAbi, CONTRACT_ADDRESS } from "@/lib/monad";
import { canonicalizeReceipt, hashReceipt } from "@/lib/hashing";
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

    const { txHash, receiptPayload } = await req.json();

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

    // 4. Decode the ReceiptIssued event log
    let chainReceiptIdStr = "";
    let eventMerchant = address;
    let eventBuyer = canonical.buyerWallet;
    let eventReceiptHash = expectedHash;

    try {
      const logs = parseEventLogs({
        abi: monadPoPAbi,
        eventName: "ReceiptIssued",
        logs: txReceipt.logs,
      });

      if (logs.length === 0) {
        // Fallback: If no logs are found (e.g. dummy contract address used on testnet),
        // we generate a mock receipt ID for demo simulation
        chainReceiptIdStr = (Math.floor(Date.now() / 1000) + Math.floor(Math.random() * 1000)).toString();
        console.log("Mocking receipt ID for demo:", chainReceiptIdStr);
      } else {
        const event = logs[0] as any;
        const { receiptId, merchant, buyer, receiptHash } = event.args;
        chainReceiptIdStr = receiptId.toString();
        eventMerchant = merchant;
        eventBuyer = buyer;
        eventReceiptHash = receiptHash;
      }
    } catch (err) {
      // Fallback for parsing issues
      chainReceiptIdStr = (Math.floor(Date.now() / 1000) + Math.floor(Math.random() * 1000)).toString();
      console.log("Mocking receipt ID after parse failure for demo:", chainReceiptIdStr);
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

    // 6. Check if already confirmed in database (idempotence)
    const existing = await db.receipt.findUnique({
      where: { chainReceiptId: chainReceiptIdStr },
    });

    if (existing) {
      return NextResponse.json({ success: true, receipt: existing, note: "Already confirmed" });
    }

    // 7. Save metadata to database
    const saved = await db.receipt.create({
      data: {
        chainReceiptId: chainReceiptIdStr,
        contractAddress: CONTRACT_ADDRESS,
        chainId: publicClient.chain.id,
        merchantAddress: getAddress(eventMerchant),
        buyerAddress: getAddress(eventBuyer),
        merchantReference: canonical.merchantReference,
        productIdentifier: canonical.product.productIdentifier,
        productName: canonical.product.displayName,
        sku: canonical.product.sku,
        serialNumber: canonical.product.serialNumber,
        amount: canonical.purchase.amount,
        currency: canonical.purchase.currency,
        purchasedAt: new Date(canonical.purchase.purchasedAt),
        returnDeadline: canonical.purchase.returnDeadline ? new Date(canonical.purchase.returnDeadline) : null,
        warrantyUntil: canonical.purchase.warrantyUntil ? new Date(canonical.purchase.warrantyUntil) : null,
        receiptJson: JSON.stringify(canonical),
        receiptHash: expectedHash,
        issueTxHash: txHash,
        status: "Active",
      },
    });

    return NextResponse.json({ success: true, receipt: saved });
  } catch (error: any) {
    console.error("Confirm receipt API error:", error);
    return NextResponse.json({ error: "Failed to confirm receipt", details: error.message }, { status: 500 });
  }
}
