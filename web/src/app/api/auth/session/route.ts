import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";

export async function GET() {
  try {
    const sessionCookie = cookies().get("monad-pop-session");
    if (!sessionCookie) {
      return NextResponse.json({ address: null });
    }

    const address = await verifyToken(sessionCookie.value);
    if (!address) {
      return NextResponse.json({ address: null });
    }

    return NextResponse.json({ address });
  } catch (error) {
    console.error("Session API Error:", error);
    return NextResponse.json({ address: null }, { status: 500 });
  }
}
