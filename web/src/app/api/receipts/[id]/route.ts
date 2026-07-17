import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { db } from "@/lib/db";
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
    const receipt = await db.receipt.findUnique({
      where: { id: params.id },
    });

    if (!receipt) {
      return NextResponse.json({ error: "Receipt not found" }, { status: 404 });
    }

    // Verify permission: Must be the buyer or the merchant
    if (
      getAddress(receipt.buyerAddress) !== normalizedAddress &&
      getAddress(receipt.merchantAddress) !== normalizedAddress
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ receipt });
  } catch (error) {
    console.error("Fetch receipt details API error:", error);
    return NextResponse.json({ error: "Failed to fetch receipt details" }, { status: 500 });
  }
}
