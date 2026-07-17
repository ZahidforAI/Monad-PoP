import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { publicClient, monadPoPAbi, CONTRACT_ADDRESS } from "@/lib/monad";
import { db } from "@/lib/db";
import { getAddress } from "viem";

const STATUS_MAP = ["Active", "Returned", "Refunded", "Replaced", "Revoked"];

export async function PATCH(
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

    // 1. Fetch current database record
    const receipt = await db.receipt.findUnique({
      where: { id: params.id },
    });

    if (!receipt) {
      return NextResponse.json({ error: "Receipt not found" }, { status: 404 });
    }

    // 2. Validate issuing merchant
    if (getAddress(receipt.merchantAddress) !== normalizedAddress) {
      return NextResponse.json({ error: "Forbidden: You are not the issuing merchant" }, { status: 403 });
    }

    // 3. Fetch status from Monad Testnet
    let onChainStatusStr = receipt.status;
    try {
      const onChainData: any = await publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: monadPoPAbi,
        functionName: "getReceipt",
        args: [BigInt(receipt.chainReceiptId)],
      } as any);

      const onChainStatusEnum = onChainData.status; // uint8
      if (onChainStatusEnum >= 0 && onChainStatusEnum < STATUS_MAP.length) {
        onChainStatusStr = STATUS_MAP[onChainStatusEnum];
      }
    } catch (err: any) {
      console.warn("Failed to fetch receipt status from Monad Testnet RPC. If this is a demo receipt, fallback to request body status.", err);
      // Fallback for demo mode receipts that are not on-chain
      if (receipt.issueTxHash.startsWith("demo-tx-hash")) {
        const body = await req.json().catch(() => ({}));
        if (body.status && STATUS_MAP.includes(body.status)) {
          onChainStatusStr = body.status;
        }
      } else {
        return NextResponse.json({ error: "Monad RPC unavailable, cannot sync on-chain status" }, { status: 503 });
      }
    }

    // 4. Update off-chain database record
    const updated = await db.receipt.update({
      where: { id: params.id },
      data: { status: onChainStatusStr },
    });

    return NextResponse.json({ success: true, receipt: updated });
  } catch (error: any) {
    console.error("Update receipt status API error:", error);
    return NextResponse.json({ error: "Failed to update receipt status", details: error.message }, { status: 500 });
  }
}
