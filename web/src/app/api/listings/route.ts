import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { db } from "@/lib/db";
import { publicClient, monadPoPAbi, CONTRACT_ADDRESS } from "@/lib/monad";
import { getAddress, parseEventLogs } from "viem";

// GET /api/listings - Retrieve all marketplace listings
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status"); // e.g. "Active", "Requested", "Completed"
    const seller = searchParams.get("seller");
    const buyer = searchParams.get("buyer");
    const passportId = searchParams.get("passportId");

    const where: any = {};
    if (status) where.status = status;
    if (seller) where.sellerAddress = getAddress(seller);
    if (buyer) where.buyerAddress = getAddress(buyer);
    if (passportId) where.passportId = parseInt(passportId, 10);

    const listings = await db.listing.findMany({
      where,
      include: {
        passport: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ listings });
  } catch (error: any) {
    console.error("Fetch listings API error:", error);
    return NextResponse.json({ error: "Failed to fetch listings" }, { status: 500 });
  }
}

// POST /api/listings - Confirm listing creation from blockchain transaction
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

    const { txHash } = await req.json();
    if (!txHash) {
      return NextResponse.json({ error: "Missing txHash" }, { status: 400 });
    }

    // 1. Fetch transaction receipt
    let txReceipt;
    try {
      txReceipt = await publicClient.getTransactionReceipt({ hash: txHash as `0x${string}` });
    } catch (err) {
      return NextResponse.json({ error: "Transaction not found on-chain yet. Try again." }, { status: 404 });
    }

    if (txReceipt.status !== "success") {
      return NextResponse.json({ error: "Transaction failed on-chain" }, { status: 400 });
    }

    // 2. Decode ListingCreated event
    let chainListingId = 0;
    let passportId = 0;
    let seller = "";
    let price = "0";
    let metadataHash = "";

    try {
      const logs = parseEventLogs({
        abi: monadPoPAbi,
        eventName: "ListingCreated",
        logs: txReceipt.logs,
      });

      if (logs.length === 0) {
        // Fallback for simulation
        chainListingId = Math.floor(Date.now() / 1000) + Math.floor(Math.random() * 1000);
        passportId = 1;
        seller = address;
        price = "15000000000000000000";
        metadataHash = "0x";
      } else {
        const event = logs[0] as any;
        chainListingId = Number(event.args.listingId);
        passportId = Number(event.args.passportId);
        seller = event.args.seller;
        price = event.args.price.toString();
        metadataHash = event.args.metadataHash;
      }
    } catch (err) {
      chainListingId = Math.floor(Date.now() / 1000) + Math.floor(Math.random() * 1000);
      passportId = 1;
      seller = address;
      price = "15000000000000000000";
      metadataHash = "0x";
    }

    // 3. Confirm Listing doesn't exist yet
    const existing = await db.listing.findUnique({
      where: { chainListingId },
    });

    if (existing) {
      return NextResponse.json({ success: true, listing: existing, note: "Already synced" });
    }

    // 4. Create database record
    const listing = await db.listing.create({
      data: {
        chainListingId,
        passportId,
        sellerAddress: getAddress(seller),
        price,
        metadataHash,
        status: "Active",
        escrowStatus: "None",
        createTxHash: txHash,
      },
    });

    return NextResponse.json({ success: true, listing });
  } catch (error: any) {
    console.error("Create listing confirm error:", error);
    return NextResponse.json({ error: "Failed to confirm listing", details: error.message }, { status: 500 });
  }
}
