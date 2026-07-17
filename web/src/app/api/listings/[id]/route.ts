import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const chainListingId = parseInt(params.id, 10);
    if (isNaN(chainListingId)) {
      return NextResponse.json({ error: "Invalid listing ID" }, { status: 400 });
    }

    const listing = await db.listing.findUnique({
      where: { chainListingId },
      include: {
        passport: true,
      },
    });

    if (!listing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    return NextResponse.json({ listing });
  } catch (error: any) {
    console.error("Fetch listing detail API error:", error);
    return NextResponse.json({ error: "Failed to fetch listing detail", details: error.message }, { status: 500 });
  }
}
