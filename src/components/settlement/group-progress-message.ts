import type { GroupSettlementPage } from "@/db/group-settlements";
import { remainingDepositSat } from "@/lib/settlement";

interface ProgressInput {
  readonly status: GroupSettlementPage["status"];
  readonly pot: GroupSettlementPage["pot"];
  readonly preview: { readonly missingNames: readonly string[] };
}

export function groupProgressMessage(page: ProgressInput): {
  readonly title: string;
  readonly description: string;
} {
  if (page.status === "open") {
    return {
      title: "Settlement review",
      description:
        page.preview.missingNames.length > 0
          ? `Addresses required: ${page.preview.missingNames.join(", ")}.`
          : "Ready for the organizer to lock settlement.",
    };
  }
  if (page.pot === null) {
    return {
      title: page.status === "settled" ? "Settled" : "Pot setup incomplete",
      description:
        page.status === "settled" ? "No payments required." : "The organizer must resume pot setup before deposits.",
    };
  }
  if (page.pot.status === "settled") {
    return { title: "Settlement complete", description: "All payouts confirmed." };
  }
  if (page.pot.participants.some((person) => person.payoutStatus === "sending")) {
    return {
      title: "Payout needs reconciliation",
      description: "The organizer must reconcile the pending payment before retrying.",
    };
  }
  return { title: "Settling", description: `${remainingDepositSat(page.pot).toLocaleString()} sats still required.` };
}
