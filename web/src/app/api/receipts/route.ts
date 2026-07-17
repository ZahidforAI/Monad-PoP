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

    let receipts;
    if (role === "merchant") {
      receipts = await db.receipt.findMany({
        where: {
          merchantAddress: normalizedAddress,
        },
        orderBy: {
          purchasedAt: "desc",
        },
      });
    } else {
      receipts = await db.receipt.findMany({
        where: {
          buyerAddress: normalizedAddress,
        },
        orderBy: {
          purchasedAt: "desc",
        },
      });
    }

    return NextResponse.json({ receipts });
  } catch (error) {
    console.error("Fetch receipts API error:", error);
    return NextResponse.json({ error: "Failed to fetch receipts" }, { status: 500 });
  }
}
