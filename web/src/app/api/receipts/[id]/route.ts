import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { db } from "@/lib/db";
import { decryptData } from "@/lib/crypto";
import { getAddress } from "viem";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const sessionCookie = cookies().get("monad-pop-session");
    if (!sessionCookie) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const address = await verifyToken(sessionCookie.value);
    if (!address) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const normalizedAddress = getAddress(address);
    
    // Fetch passport and its private data
    const passport = await db.productPassport.findFirst({
      where: {
        OR: [
          { id: params.id },
          { chainPassportId: isNaN(parseInt(params.id)) ? -1 : parseInt(params.id) }
        ]
      },
      include: {
        privateData: true,
      },
    });

    if (!passport) {
      return NextResponse.json({ error: "Product passport not found" }, { status: 404 });
    }

    // Verify permission: Must be the current owner or the issuing merchant
    if (
      getAddress(passport.currentOwnerAddress) !== normalizedAddress &&
      getAddress(passport.merchantAddress) !== normalizedAddress
    ) {
      return NextResponse.json({ error: "Forbidden: You are not authorized to view this passport." }, { status: 403 });
    }

    // Decrypt the private data
    let decryptedPayload: any = {};
    if (passport.privateData) {
      try {
        const decryptedStr = decryptData(
          passport.privateData.encryptedPayload,
          passport.privateData.iv,
          passport.privateData.tag
        );
        decryptedPayload = JSON.parse(decryptedStr);
      } catch (err) {
        console.error("Failed to decrypt private passport data:", err);
      }
    }

    // Merge public and decrypted fields into a backwards-compatible receipt object
    const receipt = {
      id: passport.id,
      chainReceiptId: passport.chainPassportId.toString(),
      contractAddress: passport.contractAddress,
      chainId: passport.chainId,
      merchantAddress: passport.merchantAddress,
      buyerAddress: passport.currentOwnerAddress, // current owner maps to buyer address
      originalBuyerAddress: passport.originalBuyerAddress,
      productIdentifier: passport.productId,
      productName: passport.productName,
      brand: passport.brand,
      model: passport.model,
      imageUrl: passport.imageUrl,
      description: passport.description,
      merchantName: passport.merchantName,
      metadataHash: passport.metadataHash,
      issueTxHash: passport.issueTxHash,
      status: passport.status,
      purchasedAt: passport.purchasedAt.toISOString(),
      warrantyUntil: passport.warrantyUntil?.toISOString() || null,
      
      // Decrypted fields
      serialNumber: decryptedPayload.serialNumber || "",
      sku: decryptedPayload.sku || "",
      merchantReference: decryptedPayload.merchantReference || `PASSPORT-${passport.chainPassportId}`,
      receiptJson: decryptedPayload.receiptJson || "{}",
      privateBuyerInfo: decryptedPayload.privateBuyerInfo || "",
      privateNotes: decryptedPayload.privateNotes || "",
      warrantyDocs: decryptedPayload.warrantyDocs || "",
      amount: "0.0", // backward compatibility stub
      currency: "MON",
    };

    return NextResponse.json({ receipt });
  } catch (error) {
    console.error("Fetch receipt details API error:", error);
    return NextResponse.json({ error: "Failed to fetch receipt details" }, { status: 500 });
  }
}
