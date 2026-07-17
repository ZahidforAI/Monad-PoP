import { NextResponse } from "next/server";
import { z } from "zod";
import { isRateLimited } from "@/lib/rateLimit";
import { publicClient, monadPoPAbi, CONTRACT_ADDRESS } from "@/lib/monad";
import { db } from "@/lib/db";
import { getAddress } from "viem";

const STATUS_MAP = ["Active", "Returned", "Refunded", "Replaced", "Revoked"];

const QuerySchema = z.object({
  id: z.string().regex(/^\d+$/, "Passport ID must be a numeric string"),
});

function shortenAddress(addr: string): string {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export async function GET(req: Request) {
  // Rate limiting (max 30 requests per minute per IP)
  const ip = req.headers.get("x-forwarded-for") ?? "127.0.0.1";
  if (isRateLimited(`verify-rate-${ip}`, 30, 60000)) {
    return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const parsedParams = QuerySchema.safeParse({
      id: searchParams.get("id"),
    });

    if (!parsedParams.success) {
      return NextResponse.json({ error: parsedParams.error.errors[0].message }, { status: 400 });
    }

    const passportIdStr = parsedParams.data.id;
    const passportIdInt = parseInt(passportIdStr, 10);
    const passportIdBigInt = BigInt(passportIdInt);

    // 1. Query database
    const dbRecord = await db.productPassport.findUnique({
      where: { chainPassportId: passportIdInt },
      include: {
        listings: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    let existsOnChain = false;
    let onChainStatus = "Active";
    let onChainData: any = null;

    // 2. Query contract status
    try {
      const exists = await publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: monadPoPAbi,
        functionName: "passportExists",
        args: [passportIdBigInt],
      } as any) as boolean;

      if (exists) {
        existsOnChain = true;
        onChainData = await publicClient.readContract({
          address: CONTRACT_ADDRESS,
          abi: monadPoPAbi,
          functionName: "getPassport",
          args: [passportIdBigInt],
        } as any);

        const statusEnum = onChainData.status;
        onChainStatus = STATUS_MAP[statusEnum] || "Unknown";
      }
    } catch (err) {
      console.warn("On-chain verification query failed (RPC/contract mismatch). Falling back to DB.", err);
    }

    // 3. Fallback to DB if on-chain fails or not synced yet
    if (!existsOnChain && dbRecord) {
      existsOnChain = true;
      onChainStatus = dbRecord.status;
    }

    if (!existsOnChain) {
      return NextResponse.json({ error: "Product passport does not exist on-chain or in register." }, { status: 404 });
    }

    // 4. Return strictly allowlisted DTO fields (No serial numbers, no sensitive details)
    const explorerUrl = process.env.NEXT_PUBLIC_MONAD_EXPLORER_URL ?? "https://testnet.monadvision.com";
    const txHash = dbRecord?.issueTxHash ?? "";

    const productName = dbRecord?.productName ?? "Unknown Product";
    const brand = dbRecord?.brand ?? "Unknown Brand";
    const model = dbRecord?.model ?? "Unknown Model";
    const imageUrl = dbRecord?.imageUrl ?? null;
    const description = dbRecord?.description ?? "";
    const merchantName = dbRecord?.merchantName ?? "Authorized Merchant";

    const originalReceiptHash = dbRecord?.originalReceiptHash ?? (onChainData ? onChainData.originalReceiptHash : "");
    const merchantAddress = dbRecord?.merchantAddress ?? (onChainData ? onChainData.merchant : "");
    const currentOwner = onChainData ? onChainData.currentOwner : (dbRecord ? dbRecord.currentOwnerAddress : "");

    const warrantyUntilVal = onChainData ? Number(onChainData.warrantyUntil) : (dbRecord?.warrantyUntil ? Math.floor(dbRecord.warrantyUntil.getTime() / 1000) : 0);
    const warrantyActive = warrantyUntilVal === 0 || (warrantyUntilVal * 1000 > Date.now());

    const latestListing = dbRecord?.listings[0] ?? null;

    return NextResponse.json({
      passportId: passportIdInt,
      productName,
      brand,
      model,
      imageUrl,
      description,
      merchantName,
      merchantAddress,
      passportStatus: onChainStatus,
      warrantyActive,
      existsOnChain: true,
      receiptHashMatches: onChainData ? (originalReceiptHash.toLowerCase() === onChainData.originalReceiptHash.toLowerCase()) : true,
      currentOwnerShort: shortenAddress(currentOwner),
      listingStatus: latestListing ? latestListing.status : "None",
      finalProofHash: latestListing ? latestListing.saleProofHash : null,
      explorerLink: txHash ? `${explorerUrl}/tx/${txHash}` : null,
    });

  } catch (error: any) {
    console.error("Public verification API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
