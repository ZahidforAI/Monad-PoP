import { getAddress, verifyMessage } from "viem";

const SECRET = process.env.AUTH_SECRET || "dev-secret-key-must-be-at-least-32-characters-long-for-hmac-sha256";

// Simple utility to sign string payloads using HMAC-SHA256 and Web Crypto API
async function hmacSign(message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Buffer.from(signature).toString("base64url");
}

async function hmacVerify(message: string, signature: string): Promise<boolean> {
  try {
    const expected = await hmacSign(message);
    return expected === signature;
  } catch {
    return false;
  }
}

export function generateNonce(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

/**
 * Creates a signed token for nonces or sessions.
 * Format: value.expiresAt.signature
 */
export async function createToken(value: string, maxAgeMs: number): Promise<string> {
  const expiresAt = Date.now() + maxAgeMs;
  const raw = `${value}:${expiresAt}`;
  const sig = await hmacSign(raw);
  return `${raw}.${sig}`;
}

/**
 * Verifies a token and returns the value if valid, or null.
 */
export async function verifyToken(token: string): Promise<string | null> {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;

  const raw = parts[0];
  const sig = parts[1];

  const isValid = await hmacVerify(raw, sig);
  if (!isValid) return null;

  const rawParts = raw.split(":");
  if (rawParts.length !== 2) return null;

  const value = rawParts[0];
  const expiresAt = parseInt(rawParts[1], 10);

  if (Date.now() > expiresAt) {
    return null; // Expired
  }

  return value;
}

/**
 * Helper to construct the standard authentication message to be signed by the wallet.
 */
export function getAuthMessage(nonce: string): string {
  return `Monad Proof of Purchase (Monad PoP) Wallet Authentication request.
Nonce: ${nonce}
Domain: localhost
Ensure you are signing this request to prove ownership of your wallet.`;
}

/**
 * Verifies a signature from an EVM wallet.
 */
export async function verifyWalletSignature(
  address: string,
  nonce: string,
  signature: `0x${string}`
): Promise<boolean> {
  try {
    const message = getAuthMessage(nonce);
    const isValid = await verifyMessage({
      address: address as `0x${string}`,
      message,
      signature,
    });
    return isValid;
  } catch (err) {
    console.error("Signature verification error:", err);
    return false;
  }
}
