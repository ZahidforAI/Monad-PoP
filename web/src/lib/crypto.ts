import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";

function getEncryptionKey(): Buffer {
  const rawKey = process.env.DATA_ENCRYPTION_KEY;
  if (!rawKey) {
    throw new Error("DATA_ENCRYPTION_KEY environment variable is not set!");
  }
  // Hash the raw key with SHA-256 to guarantee a 32-byte key size
  return crypto.createHash("sha256").update(rawKey).digest();
}

/**
 * Encrypts a plaintext string using AES-256-GCM.
 * Returns hex encoded ciphertext, iv, and auth tag.
 */
export function encryptData(plaintext: string): { ciphertext: string; iv: string; tag: string } {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12); // Standard 12-byte IV for GCM
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let ciphertext = cipher.update(plaintext, "utf8", "hex");
  ciphertext += cipher.final("hex");
  
  const tag = cipher.getAuthTag().toString("hex");
  
  return {
    ciphertext,
    iv: iv.toString("hex"),
    tag,
  };
}

/**
 * Decrypts an AES-256-GCM encrypted payload.
 */
export function decryptData(ciphertext: string, ivHex: string, tagHex: string): string {
  const key = getEncryptionKey();
  const iv = Buffer.from(ivHex, "hex");
  const tag = Buffer.from(tagHex, "hex");
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  
  let plaintext = decipher.update(ciphertext, "hex", "utf8");
  plaintext += decipher.final("utf8");
  
  return plaintext;
}
