import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { generateNonce, createToken } from "@/lib/auth";

export async function POST() {
  try {
    const nonce = generateNonce();
    // Nonce token expires in 5 minutes (300,000 ms)
    const nonceToken = await createToken(nonce, 300000);

    const isProd = process.env.NODE_ENV === "production";
    
    cookies().set("auth-nonce", nonceToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      maxAge: 300, // 5 minutes
      path: "/",
    });

    return NextResponse.json({ nonce });
  } catch (error) {
    console.error("Nonce API Error:", error);
    return NextResponse.json({ error: "Failed to generate nonce" }, { status: 500 });
  }
}
