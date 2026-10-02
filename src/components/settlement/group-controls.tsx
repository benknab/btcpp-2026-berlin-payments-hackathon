import { ActionError } from "@/components/action-error";
import { Button } from "@/components/ui/button";
import type { GroupSettlementPage } from "@/db/group-settlements";
import type { ReactNode } from "react";

import { GroupOrganizerControls } from "./group-organizer-controls";
import { useGroupPayment } from "./use-group-payment";

export function GroupSettlementControls({
  inviteKey,
  page,
  isOrganizer,
}: Readonly<{ inviteKey: string; page: GroupSettlementPage; isOrganizer: boolean }>): ReactNode {
  const action = useGroupPayment(inviteKey, page.preview.fingerprint);
  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-3">
        <Button
          variant="outline"
          onClick={() => {
            action.refreshView();
          }}
          disabled={action.pending}
        >
          Refresh status
        </Button>
        {isOrganizer && page.status !== "settled" && <GroupOrganizerControls page={page} action={action} />}
      </div>
      <ActionError message={action.error} />
    </section>
  );
}
