import type { EventInvoice } from "@/db/event-payment-schema";
import { QRCodeSVG } from "qrcode.react";
import type { ReactNode } from "react";

import { ActionError } from "./action-error";
import { ReadOnlyField } from "./read-only-field";
import { Button } from "./ui/button";
import { useAction } from "./use-action";

export function ContributionQr({ invoice }: { readonly invoice: Readonly<EventInvoice> }): ReactNode {
  const action = useAction();
  function handleCopy(): void {
    action.run(() => navigator.clipboard.writeText(invoice.invoice), "Could not copy the invoice.");
  }
  return (
    <div className="flex flex-col gap-3">
      <QRCodeSVG
        value={`lightning:${invoice.invoice.toUpperCase()}`}
        title="Contribution invoice"
        marginSize={4}
        className="size-48"
      />
      <ReadOnlyField
        id={`invoice-${invoice.paymentHash}`}
        label="Lightning invoice"
        value={invoice.invoice}
        selectOnFocus
      />
      <Button variant="outline" onClick={handleCopy}>
        Copy invoice
      </Button>
      <p className="text-sm text-muted-foreground">Expires {new Date(invoice.expiresAt).toLocaleString()}</p>
      <ActionError message={action.error} />
    </div>
  );
}
