import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { db } from "@/lib/db";
import { isRateLimited } from "@/lib/rateLimit";
import { getAddress } from "viem";
import { publicClient, monadPoPAbi, CONTRACT_ADDRESS } from "@/lib/monad";
import { decryptData } from "@/lib/crypto";
import { ChatGroq } from "@langchain/groq";
import { z } from "zod";

const IntentSchema = z.object({
  intent: z.enum([
    "SEARCH_RECEIPTS",
    "RETURN_ELIGIBILITY",
    "WARRANTY_STATUS",
    "EXPIRING_WARRANTIES",
    "VERIFY_RECEIPT",
    "MERCHANT_SUMMARY",
    "GENERAL_HELP",
  ]),
  searchTerm: z.string().optional(),
  daysLimit: z.number().optional(),
  chainReceiptId: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    // 1. Authenticate user session (SIWE verification)
    const sessionCookie = cookies().get("monad-pop-session");
    if (!sessionCookie) {
      return NextResponse.json({ error: "Unauthorized: Wallet not connected or authenticated" }, { status: 401 });
    }

    const address = await verifyToken(sessionCookie.value);
    if (!address) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const normalizedAddress = getAddress(address);

    // 2. Rate limiting
    if (isRateLimited(normalizedAddress, 15, 60000)) {
      return NextResponse.json({ error: "Too many requests. Please wait a moment." }, { status: 429 });
    }

    // 3. Check for Groq API Key
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          error: "AI Assistant is currently unavailable because the GROQ_API_KEY environment variable is not configured. Please paste your Groq API key in web/.env.local to enable the AI Chat.",
        },
        { status: 503 }
      );
    }

    const body = await req.json();
    const { messages } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "Missing chat history or message" }, { status: 400 });
    }

    const userMessage = messages[messages.length - 1].content;

    // 4. Initialize Groq model
    const model = new ChatGroq({
      apiKey,
      model: process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile",
      temperature: 0,
      maxRetries: 2,
    });

    // 5. Classify the user query using structured output
    let classification;
    try {
      const structuredModel = model.withStructuredOutput(IntentSchema);
      classification = await structuredModel.invoke([
        {
          role: "system",
          content: "Classify the user request and extract key search parameters regarding their product passports.",
        },
        { role: "user", content: userMessage },
      ]);
    } catch (err: any) {
      console.error("Classification failure, fallback to GENERAL_HELP:", err);
      classification = { intent: "GENERAL_HELP" as const };
    }

    const { intent, searchTerm, daysLimit, chainReceiptId } = classification;
    console.log("AI Intent Classified:", { intent, searchTerm, daysLimit, chainReceiptId });

    // 6. Context Retrieval: Fetch authenticated user's owned product passports including private data
    const whereClause: any = {
      currentOwnerAddress: normalizedAddress,
    };

    if (chainReceiptId) {
      const parsedId = parseInt(chainReceiptId, 10);
      if (!isNaN(parsedId)) {
        whereClause.chainPassportId = parsedId;
      }
    } else if (searchTerm) {
      whereClause.OR = [
        { productName: { contains: searchTerm } },
        { brand: { contains: searchTerm } },
        { model: { contains: searchTerm } },
      ];
    }

    const dbPassports = await db.productPassport.findMany({
      where: whereClause,
      include: {
        privateData: true,
      },
      orderBy: { purchasedAt: "desc" },
    });

    // 7. Verify passport state and decrypt private details
    const contextPassports = [];
    for (const p of dbPassports) {
      let isVerified = false;
      let onChainStatus = "RPC offline";
      let details = "Not checked";

      // Decrypt private details
      let decryptedPayload: any = {};
      if (p.privateData) {
        try {
          const decryptedStr = decryptData(
            p.privateData.encryptedPayload,
            p.privateData.iv,
            p.privateData.tag
          );
          decryptedPayload = JSON.parse(decryptedStr);
        } catch (err) {
          console.error(`Failed to decrypt private data for passport id: ${p.chainPassportId}`, err);
        }
      }

      if (p.issueTxHash.startsWith("demo-tx-hash")) {
        isVerified = false;
        onChainStatus = "Demo — Not On-chain";
        details = "Local demo seeded passport. No on-chain contract record exists.";
      } else {
        // Read on-chain proof from Monad contract
        try {
          const onChainPassport: any = await publicClient.readContract({
            address: CONTRACT_ADDRESS,
            abi: monadPoPAbi,
            functionName: "getPassport",
            args: [BigInt(p.chainPassportId)],
          } as any);

          const hashMatches = onChainPassport.originalReceiptHash.toLowerCase() === p.originalReceiptHash.toLowerCase();
          const STATUS_ENUMS = ["Active", "Returned", "Refunded", "Replaced", "Revoked"];
          onChainStatus = STATUS_ENUMS[onChainPassport.status] || "Unknown";

          if (hashMatches && onChainPassport.currentOwner.toLowerCase() === normalizedAddress.toLowerCase()) {
            isVerified = true;
            details = `Decoded receipt hash matches on-chain record (${onChainPassport.originalReceiptHash}). Verified on Monad.`;
          } else {
            isVerified = false;
            details = `Verification failed. Hash match: ${hashMatches}. Owner match: ${onChainPassport.currentOwner.toLowerCase() === normalizedAddress.toLowerCase()}`;
          }
        } catch (err) {
          console.error("Error reading contract status for passport:", p.chainPassportId, err);
          onChainStatus = "RPC offline";
          details = "Failed to query the Monad PoP contract on-chain.";
        }
      }

      contextPassports.push({
        passportId: p.chainPassportId,
        productName: p.productName,
        brand: p.brand,
        model: p.model,
        status: p.status,
        purchasedAt: p.purchasedAt.toISOString(),
        warrantyUntil: p.warrantyUntil ? p.warrantyUntil.toISOString() : "None",
        isVerified,
        onChainStatus,
        verificationDetails: details,
        
        // Securely decrypted fields made available to LLM context
        serialNumber: decryptedPayload.serialNumber || "None",
        sku: decryptedPayload.sku || "None",
        merchantReference: decryptedPayload.merchantReference || "None",
        privateNotes: decryptedPayload.privateNotes || "None",
        warrantyDocs: decryptedPayload.warrantyDocs || "None",
      });
    }

    // 8. Filter context based on classification intent
    let filteredContext = contextPassports;
    if (intent === "RETURN_ELIGIBILITY") {
      filteredContext = contextPassports.filter((p) => p.status === "Active");
    } else if (intent === "WARRANTY_STATUS" || intent === "EXPIRING_WARRANTIES") {
      const limitDays = daysLimit ?? 30;
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + limitDays);

      filteredContext = contextPassports.filter((p) => {
        if (p.warrantyUntil === "None") return false;
        const wDate = new Date(p.warrantyUntil);
        return wDate > new Date() && wDate <= targetDate;
      });
    }

    // 9. Call Groq LLM with system prompt containing decrypted context
    const systemPrompt = `You are the Monad PoP AI Assistant.

You help an authenticated user understand their owned Product Passports, return options, warranty terms, and secure details like product serial numbers or SKUs.

Context of user's owned product passports (decrypting private details):
${JSON.stringify(filteredContext, null, 2)}

Rules:
1. Use only the product passport and decrypted blockchain context supplied by the server.
2. Never invent or assume a serial number, SKU, warranty date, or merchant name.
3. Clearly distinguish between database public metadata and on-chain verified status.
4. Only describe details that are present in the context.
5. If the user asks for a serial number, SKU, or warranty document URL, lookup the decrypted 'serialNumber', 'sku', or 'warrantyDocs' fields in the context and provide it directly.
6. A passport is verified only if 'isVerified' is true.
7. Keep answers professional, direct, and refer to the specific Passport ID or product brand/model.
`;

    const chatMessages = [
      { role: "system", content: systemPrompt },
      ...messages.slice(-6).map((m: any) => ({ role: m.role, content: m.content })),
    ];

    const response = await model.invoke(chatMessages);

    return NextResponse.json({
      response: response.content,
      classifiedIntent: intent,
      retrievedCount: contextPassports.length,
    });
  } catch (error: any) {
    console.error("AI Chat API Error:", error);
    return NextResponse.json({ error: "Internal server error", details: error.message }, { status: 500 });
  }
}
