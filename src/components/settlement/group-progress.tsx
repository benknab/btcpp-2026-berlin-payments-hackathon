import { DepositCard } from "@/components/settlement/deposit-card";
import { PotSummary } from "@/components/settlement/pot-summary";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { GroupSettlementPage } from "@/db/group-settlements";
import { participantPayoutLabel, remainingDepositSat } from "@/lib/settlement";
import type { ReactNode } from "react";

export function GroupSettlementProgress({
  page,
  participantId,
}: Readonly<{ page: GroupSettlementPage; participantId: string | null }>): ReactNode {
  if (page.status === "open") {
    return (
      <Alert>
        <AlertTitle>
          {page.preview.missingNames.length > 0 ? "Personal addresses needed" : "Ready for organizer review"}
        </AlertTitle>
        <AlertDescription>
          {page.preview.missingNames.length > 0
            ? `Waiting for: ${page.preview.missingNames.join(", ")}. Ask the organizer for your private address-setup link.`
            : "No deposits are needed until the organizer closes the group. Each person pays only their net debt, not their full expense share."}
        </AlertDescription>
      </Alert>
    );
  }
  if (page.pot === null) {
    return (
      <Alert>
        <AlertTitle>{page.status === "settled" ? "All square" : "Expenses locked · pot setup incomplete"}</AlertTitle>
        <AlertDescription>
          {page.status === "settled"
            ? "Everyone’s net balance is zero. No money needs to move."
            : "The organizer must resume pot setup with the same isolated wallet. Do not send money until deposit instructions appear."}
        </AlertDescription>
      </Alert>
    );
  }
  const personal = page.pot.participants.find((person) => person.userId === participantId);
  const uncertain = page.pot.participants.some((person) => person.payoutStatus === "sending");
  let title = "Expenses locked · settling up";
  let description = `${remainingDepositSat(page.pot).toLocaleString()} sats still required. All participants must pay their own assigned deposit before payouts.`;
  if (page.pot.status === "settled") {
    title = "Settlement complete";
    description = "All required payouts have confirmed Bark movement references.";
  } else if (uncertain) {
    title = "Payout needs reconciliation";
    description =
      "A send may have completed without a response. Do not resend from a wallet or reset this pot. The organizer can reconcile and finish payouts.";
  }
  return (
    <>
      <Alert>
        <AlertTitle>{title}</AlertTitle>
        <AlertDescription>{description}</AlertDescription>
      </Alert>
      {personal !== undefined && personal.payInSat > 0 ? <DepositCard participant={personal} /> : null}
      {personal !== undefined && personal.receiveSat > 0 ? (
        <Alert>
          <AlertTitle>You receive {personal.receiveSat.toLocaleString()} sats</AlertTitle>
          <AlertDescription>{participantPayoutLabel(personal)}. No deposit is needed from you.</AlertDescription>
        </Alert>
      ) : null}
      <PotSummary pot={page.pot} />
    </>
  );
}
