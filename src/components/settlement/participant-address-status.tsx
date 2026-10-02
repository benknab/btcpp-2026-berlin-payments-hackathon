import type { DraftController } from "@/components/settlement/use-settlement-draft";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FieldDescription } from "@/components/ui/field";
import type { ReactNode } from "react";

export function ParticipantAddressStatus({
  controller,
  pending,
}: Readonly<{ controller: DraftController; pending: boolean }>): ReactNode {
  if (controller.addressPending) {
    return (
      <FieldDescription>
        <output>Generating test addresses…</output>
      </FieldDescription>
    );
  }
  if (controller.addressError === null) {
    return null;
  }
  return (
    <Alert variant="destructive">
      <AlertTitle>Test addresses unavailable</AlertTitle>
      <AlertDescription>
        {controller.addressError}
        <Button type="button" variant="outline" disabled={pending} onClick={controller.handleAddressRetry}>
          Retry address generation
        </Button>
      </AlertDescription>
    </Alert>
  );
}
