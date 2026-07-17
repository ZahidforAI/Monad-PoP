import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { db } from "@/lib/db";
import { getAddress } from "viem";

export async function GET(req: Request) {
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
    const { searchParams } = new URL(req.url);
    const role = searchParams.get("role") || "buyer"; // "buyer" or "merchant"

    let passports;
    if (role === "merchant") {
      passports = await db.productPassport.findMany({
        where: {
          merchantAddress: normalizedAddress,
        },
        orderBy: {
          purchasedAt: "desc",
        },
      });
    } else {
      passports = await db.productPassport.findMany({
        where: {
          currentOwnerAddress: normalizedAddress,
        },
        orderBy: {
          purchasedAt: "desc",
        },
      });
    }

    // Map database fields to keep backward compatibility with client components
    const mappedReceipts = passports.map(p => ({
      id: p.id,
      chainReceiptId: p.chainPassportId.toString(),
      merchantAddress: p.merchantAddress,
      buyerAddress: p.currentOwnerAddress,
      productIdentifier: p.productId,
      productName: p.productName,
      brand: p.brand,
      model: p.model,
      imageUrl: p.imageUrl,
      description: p.description,
      amount: "0.0", // mock field for backwards compat if needed
      currency: "MON",
      purchasedAt: p.purchasedAt.toISOString(),
      warrantyUntil: p.warrantyUntil?.toISOString() || null,
      status: p.status,
      issueTxHash: p.issueTxHash,
      merchantReference: `PASSPORT-${p.chainPassportId}`,
    }));

    return NextResponse.json({ receipts: mappedReceipts });
  } catch (error) {
    console.error("Fetch receipts API error:", error);
    return NextResponse.json({ error: "Failed to fetch receipts" }, { status: 500 });
  }
}
