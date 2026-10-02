import { SectionCard } from "@/components/section-card";
import { SetupFields } from "@/components/settlement/setup-fields";
import { useSettlementDraft } from "@/components/settlement/use-settlement-draft";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import type { SettlementSetupInput } from "@/lib/settlement";
import type { ReactNode, SubmitEvent } from "react";

export function SettlementSetupForm({
  pending,
  onCreate,
}: Readonly<{
  pending: boolean;
  onCreate: (setup: SettlementSetupInput) => void;
}>): ReactNode {
  const controller = useSettlementDraft();
  function submit(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault();
    const setup = controller.handlePrepare();
    if (setup !== null) {
      onCreate(setup);
    }
  }
  return (
    <SectionCard
      title="Users and debts"
      description="Enter the agreed debts and everyone’s personal Bark mainnet address. We net reciprocal debts, so each person only pays or receives their final balance. Test payout addresses are filled automatically; saving the debts does not spend funds."
      footer={
        <Button type="submit" form="settlement-setup" disabled={pending || controller.addressPending}>
          {pending ? <Spinner data-icon="inline-start" /> : null}
          {pending ? "Saving…" : "Save & lock debts"}
        </Button>
      }
    >
      <form id="settlement-setup" onSubmit={submit} noValidate>
        <SetupFields controller={controller} pending={pending} />
      </form>
    </SectionCard>
  );
}
