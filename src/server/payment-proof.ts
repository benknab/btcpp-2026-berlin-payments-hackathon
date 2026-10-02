import { createHash } from "node:crypto";

export function verifiesPaymentPreimage(paymentHash: string, preimage: string): boolean {
  return (
    /^[a-f\d]{64}$/u.test(preimage) &&
    createHash("sha256").update(Buffer.from(preimage, "hex")).digest("hex") === paymentHash
  );
}
