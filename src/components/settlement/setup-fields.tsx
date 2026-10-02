import { DebtsSection } from "@/components/settlement/debts-section";
import { ParticipantsSection } from "@/components/settlement/participants-section";
import { SetupPreview } from "@/components/settlement/setup-preview";
import type { DraftController } from "@/components/settlement/use-settlement-draft";
import { FieldGroup } from "@/components/ui/field";
import type { ReactNode } from "react";

export function SetupFields({
  controller,
  pending,
}: Readonly<{ controller: DraftController; pending: boolean }>): ReactNode {
  return (
    <FieldGroup>
      <ParticipantsSection controller={controller} pending={pending} />
      <DebtsSection controller={controller} pending={pending} />
      <SetupPreview controller={controller} />
    </FieldGroup>
  );
}
