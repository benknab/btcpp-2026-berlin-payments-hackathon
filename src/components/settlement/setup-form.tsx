import { DebtsSection } from "@/components/settlement/debts-section";
import { ParticipantsSection } from "@/components/settlement/participants-section";
import { SetupPreview } from "@/components/settlement/setup-preview";
import { useSettlementDraft } from "@/components/settlement/use-settlement-draft";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldGroup } from "@/components/ui/field";
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
    <Card>
      <CardHeader>
        <CardTitle>Users and debts</CardTitle>
        <CardDescription>
          Enter the agreed debts and everyone’s personal Bark signet address. We net reciprocal debts, so each person
          only pays or receives their final balance. Saving stores these rows in this pot; no wallet connection is
          needed.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form id="settlement-setup" onSubmit={submit} noValidate>
          <FieldGroup>
            <ParticipantsSection controller={controller} pending={pending} />
            <DebtsSection controller={controller} pending={pending} />
            <SetupPreview controller={controller} />
          </FieldGroup>
        </form>
      </CardContent>
      <CardFooter>
        <Button type="submit" form="settlement-setup" disabled={pending}>
          {pending ? <Spinner data-icon="inline-start" /> : null}
          {pending ? "Saving…" : "Save & lock debts"}
        </Button>
      </CardFooter>
    </Card>
  );
}
