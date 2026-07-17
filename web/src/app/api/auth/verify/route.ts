import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAddress } from "viem";
import { verifyToken, verifyWalletSignature, createToken } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const { address, signature } = await req.json();

    if (!address || !signature) {
      return NextResponse.json({ error: "Missing address or signature" }, { status: 400 });
    }

    // 1. Read and verify nonce token
    const cookieStore = cookies();
    const nonceCookie = cookieStore.get("auth-nonce");
    if (!nonceCookie) {
      return NextResponse.json({ error: "Nonce expired or not found. Please try again." }, { status: 400 });
    }

    const nonce = await verifyToken(nonceCookie.value);
    if (!nonce) {
      return NextResponse.json({ error: "Invalid or expired nonce. Please try again." }, { status: 400 });
    }

    // 2. Normalize and check address format
    let normalizedAddress: string;
    try {
      normalizedAddress = getAddress(address);
    } catch {
      return NextResponse.json({ error: "Invalid Ethereum address format" }, { status: 400 });
    }

    // 3. Verify EVM signature
    const isValid = await verifyWalletSignature(normalizedAddress, nonce, signature);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid signature verification" }, { status: 401 });
    }

    // 4. Create and store session token (24 hours)
    const sessionToken = await createToken(normalizedAddress, 86400000);
    const isProd = process.env.NODE_ENV === "production";

    cookieStore.set("monad-pop-session", sessionToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      maxAge: 86400, // 24 hours
      path: "/",
    });

    // Clear the nonce cookie since it was consumed
    cookieStore.delete("auth-nonce");

    return NextResponse.json({ success: true, address: normalizedAddress });
  } catch (error) {
    console.error("Verify API Error:", error);
    return NextResponse.json({ error: "Authentication failed" }, { status: 500 });
  }
}
