import { QRCodeSVG } from "qrcode.react";
import type { ReactNode } from "react";

export function PaymentQr({ address, remainingSat }: Readonly<{ address: string; remainingSat: number }>): ReactNode {
  return (
    <figure className="flex flex-col items-center gap-3">
      <QRCodeSVG value={address} size={224} marginSize={4} title="Bark signet deposit address" className="max-w-full" />
      <figcaption className="text-center text-sm text-muted-foreground">
        Scan this Bark address and enter exactly {remainingSat.toLocaleString()} sats in your wallet. The QR contains
        the address, not an amount-bearing invoice. Signet Ark only—not Lightning or on-chain.
      </figcaption>
    </figure>
  );
}
