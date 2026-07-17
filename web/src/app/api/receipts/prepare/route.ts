import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { checkIsMerchant } from "@/lib/monad";
import { canonicalizeReceipt, hashReceipt } from "@/lib/hashing";
import { keccak256, stringToBytes } from "viem";

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
    const { receiptPayload } = body;

    if (!receiptPayload) {
      return NextResponse.json({ error: "Missing receipt payload" }, { status: 400 });
    }

    // 1. Canonicalize receipt payload and validate with Zod
    let canonical;
    let receiptHash;
    try {
      canonical = canonicalizeReceipt(receiptPayload);
      receiptHash = hashReceipt(canonical);
    } catch (zodError: any) {
      return NextResponse.json({ error: "Invalid receipt payload schema", details: zodError?.errors || zodError.message }, { status: 400 });
    }

    // 2. Map fields to contract types
    // productId should be hashed to bytes32 on-chain
    const productIdHash = keccak256(stringToBytes(canonical.product.productIdentifier));
    
    // Dates to Unix timestamps
    const purchasedAtTimestamp = Math.floor(new Date(canonical.purchase.purchasedAt).getTime() / 1000);
    const warrantyUntilTimestamp = canonical.purchase.warrantyUntil
      ? Math.floor(new Date(canonical.purchase.warrantyUntil).getTime() / 1000)
      : 0;

    return NextResponse.json({
      success: true,
      canonicalPayload: canonical,
      receiptHash,
      productIdHash,
      contractArgs: {
        buyer: canonical.buyerWallet,
        productId: productIdHash,
        receiptHash,
        purchasedAt: purchasedAtTimestamp,
        warrantyUntil: warrantyUntilTimestamp,
      },
    });
  } catch (error: any) {
    console.error("Prepare receipt API error:", error);
    return NextResponse.json({ error: "Failed to prepare receipt data", details: error.message }, { status: 500 });
  }
}
