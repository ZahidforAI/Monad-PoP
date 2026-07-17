import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { db } from "@/lib/db";
import { isRateLimited } from "@/lib/rateLimit";
import { getAddress } from "viem";
import { hashReceipt } from "@/lib/hashing";
import { publicClient, monadPoPAbi, CONTRACT_ADDRESS } from "@/lib/monad";
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
    // 1. Authenticate user session
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
    if (isRateLimited(normalizedAddress, 10, 60000)) {
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
    const { messages } = body; // Array of { role: 'user' | 'assistant', content: string }

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
          content: "Classify the user request and extract key search parameters regarding their purchase receipts.",
        },
        { role: "user", content: userMessage },
      ]);
    } catch (err: any) {
      console.error("Classification failure, fallback to GENERAL_HELP:", err);
      classification = { intent: "GENERAL_HELP" as const };
    }

    const { intent, searchTerm, daysLimit, chainReceiptId } = classification;
    console.log("AI Intent Classified:", { intent, searchTerm, daysLimit, chainReceiptId });

    // 6. Context Retrieval: Fetch authenticated user's receipts from DB
    let dbReceipts = [];
    if (chainReceiptId) {
      // Find specific receipt
      const rec = await db.receipt.findFirst({
        where: {
          buyerAddress: normalizedAddress,
          chainReceiptId: chainReceiptId,
        },
      });
      if (rec) dbReceipts.push(rec);
    } else if (searchTerm) {
      // Search receipts matching criteria
      dbReceipts = await db.receipt.findMany({
        where: {
          buyerAddress: normalizedAddress,
          OR: [
            { productName: { contains: searchTerm } },
            { productIdentifier: { contains: searchTerm } },
            { merchantReference: { contains: searchTerm } },
            { sku: { contains: searchTerm } },
          ],
        },
        orderBy: { purchasedAt: "desc" },
      });
    } else {
      // Fetch all receipts to filter in memory/logic
      dbReceipts = await db.receipt.findMany({
        where: { buyerAddress: normalizedAddress },
        orderBy: { purchasedAt: "desc" },
      });
    }

    // 7. Verify receipts against Monad Testnet and build rich context
    const contextReceipts = [];
    for (const r of dbReceipts) {
      let isVerified = false;
      let onChainStatus = "RPC unavailable";
      let details = "Not checked";

      // Re-hash local metadata
      let computedHash = "";
      try {
        computedHash = hashReceipt(JSON.parse(r.receiptJson));
      } catch (err) {
        console.error("Error hashing receipt payload:", err);
      }

      if (r.issueTxHash.startsWith("demo-tx-hash")) {
        // Seeded demo receipts
        isVerified = false;
        onChainStatus = "Demo — not on-chain";
        details = "Seeded demo data. No matching transaction exists on Monad Testnet.";
      } else {
        // Read on-chain status from contract
        try {
          const onChainProof: any = await publicClient.readContract({
            address: CONTRACT_ADDRESS,
            abi: monadPoPAbi,
            functionName: "getReceipt",
            args: [BigInt(r.chainReceiptId)],
          } as any);

          const hashMatches = onChainProof.receiptHash.toLowerCase() === computedHash.toLowerCase();
          const STATUS_ENUMS = ["Active", "Returned", "Refunded", "Replaced", "Revoked"];
          onChainStatus = STATUS_ENUMS[onChainProof.status] || "Unknown";

          if (hashMatches && onChainProof.buyer.toLowerCase() === normalizedAddress.toLowerCase()) {
            isVerified = true;
            details = `Recalculated receipt metadata hash matches the on-chain receiptHash (${onChainProof.receiptHash}). Verified on Monad.`;
          } else {
            isVerified = false;
            details = `Hash mismatch! Calculated: ${computedHash}, On-chain: ${onChainProof.receiptHash}`;
          }
        } catch (err) {
          console.error("Error reading contract status for receipt id:", r.chainReceiptId, err);
          onChainStatus = "RPC unavailable";
          details = "Failed to query the Monad PoP contract on Monad Testnet.";
        }
      }

      contextReceipts.push({
        id: r.id,
        chainReceiptId: r.chainReceiptId,
        productName: r.productName,
        productIdentifier: r.productIdentifier,
        merchantReference: r.merchantReference,
        amount: r.amount,
        currency: r.currency,
        status: r.status,
        purchasedAt: r.purchasedAt.toISOString(),
        returnDeadline: r.returnDeadline ? r.returnDeadline.toISOString() : "None",
        warrantyUntil: r.warrantyUntil ? r.warrantyUntil.toISOString() : "None",
        isVerified,
        onChainStatus,
        verificationDetails: details,
      });
    }

    // 8. Filter based on classification intents
    let filteredContext = contextReceipts;
    if (intent === "RETURN_ELIGIBILITY") {
      // Focus on active/eligible return window
      filteredContext = contextReceipts.filter(
        (r) => r.status === "Active" && r.returnDeadline !== "None" && new Date(r.returnDeadline) > new Date()
      );
    } else if (intent === "WARRANTY_STATUS" || intent === "EXPIRING_WARRANTIES") {
      const limitDays = daysLimit ?? 30;
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + limitDays);

      filteredContext = contextReceipts.filter((r) => {
        if (r.warrantyUntil === "None") return false;
        const wDate = new Date(r.warrantyUntil);
        return wDate > new Date() && wDate <= targetDate;
      });
    }

    // 9. Call Groq model with system prompt and context
    const systemPrompt = `You are the Monad PoP receipt assistant.

You help an authenticated user understand their own purchase credentials, return windows, warranty deadlines, and Monad verification results.

Context of user receipts retrieved from secure server and blockchain:
${JSON.stringify(filteredContext, null, 2)}

Rules:
1. Use only the receipt and blockchain context supplied by the server.
2. Never invent a receipt, merchant, purchase date, warranty term, transaction, or on-chain status.
3. Clearly distinguish database metadata from blockchain-verified state.
4. A receipt is verified only when its recalculated metadata hash matches the on-chain receiptHash and the expected contract record exists.
5. Do not claim that a blockchain credential proves current physical possession or absolute legal title.
6. Return and warranty eligibility may depend on merchant policy and applicable law. Describe dates and recorded terms, but do not provide a legal guarantee.
7. Do not reveal another wallet's private receipt data.
8. When information is missing, state exactly what is unavailable.
9. Keep answers direct and cite the relevant receipt ID or product display name inside the response.
`;

    const chatMessages = [
      { role: "system", content: systemPrompt },
      ...messages.slice(-6).map((m: any) => ({ role: m.role, content: m.content })),
    ];

    const response = await model.invoke(chatMessages);

    return NextResponse.json({
      response: response.content,
      classifiedIntent: intent,
      retrievedCount: contextReceipts.length,
    });
  } catch (error: any) {
    console.error("AI Chat API Error:", error);
    return NextResponse.json({ error: "Internal server error", details: error.message }, { status: 500 });
  }
}
