import { z } from "zod";
import stringify from "json-stable-stringify";
import { keccak256, stringToBytes, getAddress } from "viem";

// Zod schema matching the required ReceiptPayload schema
export const ReceiptPayloadSchema = z.object({
  schemaVersion: z.literal("1.0"),
  merchantReference: z.string().min(1, "Merchant reference is required"),
  buyerWallet: z.string().refine((val) => {
    try {
      return getAddress(val) !== undefined;
    } catch {
      return false;
    }
  }, "Invalid Ethereum address format"),
  product: z.object({
    productIdentifier: z.string().min(1, "Product identifier is required"),
    sku: z.string().optional(),
    serialNumber: z.string().optional(),
    displayName: z.string().min(1, "Product display name is required"),
  }),
  purchase: z.object({
    purchasedAt: z.string().refine((val) => !isNaN(Date.parse(val)), "Invalid purchasedAt ISO date"),
    currency: z.string().min(1),
    amount: z.string().refine((val) => !isNaN(parseFloat(val)), "Invalid amount numeric string"),
    returnDeadline: z.string().refine((val) => !isNaN(Date.parse(val)), "Invalid returnDeadline ISO date").optional(),
    warrantyUntil: z.string().refine((val) => !isNaN(Date.parse(val)), "Invalid warrantyUntil ISO date").optional(),
  }),
});

export type ReceiptPayload = z.infer<typeof ReceiptPayloadSchema>;

/**
 * Normalizes, strips undefined, and sorts key-value pairs of a receipt payload.
 */
export function canonicalizeReceipt(payload: unknown): ReceiptPayload {
  // 1. Validate payload with Zod
  const parsed = ReceiptPayloadSchema.parse(payload);

  // 2. Normalize addresses
  const buyerWallet = getAddress(parsed.buyerWallet);

  // 3. Normalize ISO dates
  const purchasedAt = new Date(parsed.purchase.purchasedAt).toISOString();
  const returnDeadline = parsed.purchase.returnDeadline 
    ? new Date(parsed.purchase.returnDeadline).toISOString() 
    : undefined;
  const warrantyUntil = parsed.purchase.warrantyUntil 
    ? new Date(parsed.purchase.warrantyUntil).toISOString() 
    : undefined;

  // 4. Normalize currency to uppercase
  const currency = parsed.purchase.currency.toUpperCase();

  // 5. Remove undefined values by creating a clean object
  const cleanPayload: ReceiptPayload = {
    schemaVersion: parsed.schemaVersion,
    merchantReference: parsed.merchantReference,
    buyerWallet: buyerWallet as `0x${string}`,
    product: {
      productIdentifier: parsed.product.productIdentifier,
      displayName: parsed.product.displayName,
      ...(parsed.product.sku ? { sku: parsed.product.sku } : {}),
      ...(parsed.product.serialNumber ? { serialNumber: parsed.product.serialNumber } : {}),
    },
    purchase: {
      purchasedAt,
      currency,
      amount: parsed.purchase.amount,
      ...(returnDeadline ? { returnDeadline } : {}),
      ...(warrantyUntil ? { warrantyUntil } : {}),
    },
  };

  return cleanPayload;
}

/**
 * Computes the keccak256 hash of a deterministic stable-stringified receipt payload.
 */
export function hashReceipt(payload: unknown): `0x${string}` {
  const canonical = canonicalizeReceipt(payload);
  // json-stable-stringify automatically sorts keys deterministically
  const jsonStr = stringify(canonical);
  const bytes = stringToBytes(jsonStr);
  return keccak256(bytes);
}

/**
 * Verifies that a given receipt payload matches the expected on-chain/database hash.
 */
export function verifyReceiptPayload(payload: unknown, expectedHash: string): boolean {
  try {
    const computed = hashReceipt(payload);
    return computed.toLowerCase() === expectedHash.toLowerCase();
  } catch {
    return false;
  }
}
