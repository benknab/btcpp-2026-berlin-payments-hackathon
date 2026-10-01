import { DepositCard } from "@/components/settlement/deposit-card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useAction } from "@/components/use-action";
import type { PotParticipant } from "@/lib/pot";
import { participantPayoutLabel } from "@/lib/settlement";
import { useRouter } from "@tanstack/react-router";
import type { ReactNode } from "react";

export function PersonalPaymentStatus({
  status,
  payment,
}: Readonly<{
  status: "open" | "settling" | "settled";
  payment: PotParticipant | null;
}>): ReactNode {
  const router = useRouter();
  const action = useAction();
  function refresh(): void {
    action.run(async (): Promise<void> => {
      await router.invalidate();
    }, "Could not refresh. Reload this private link to read the saved status.");
  }
  let message =
    "The group is still open. Keep this link: your QR or payout status appears here after the organizer closes the group.";
  if (status === "settling" && payment === null) {
    message = "Expenses are locked. The organizer must finish pot setup before you pay.";
  }
  if (status === "settled" && payment === null) {
    message = "All square. No payment is needed.";
  }
  if (payment !== null) {
    message =
      payment.receiveSat > 0
        ? `You receive ${payment.receiveSat.toLocaleString()} sats. ${participantPayoutLabel(payment)}.`
        : "Ask the organizer to check deposits after you pay. Refresh here to read the saved status.";
    if (payment.payInSat === 0 && payment.receiveSat === 0) {
      message = "Your net balance is zero. You don’t need to pay or receive funds.";
    }
  }
  return (
    <>
      <Alert>
        <AlertTitle>Your settlement</AlertTitle>
        <AlertDescription>{action.error ?? message}</AlertDescription>
      </Alert>
      {payment !== null && payment.payInSat > 0 ? <DepositCard participant={payment} /> : null}
      <Button variant="outline" onClick={refresh} disabled={action.pending}>
        Refresh my payment status
      </Button>
    </>
  );
}
