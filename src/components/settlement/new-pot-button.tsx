import { ActionError } from "@/components/action-error";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useAction } from "@/components/use-action";
import { newSettlement } from "@/server/settlement";
import { useNavigate } from "@tanstack/react-router";
import { PlusIcon } from "lucide-react";
import type { ReactNode } from "react";

export function NewPotButton(): ReactNode {
  const action = useAction();
  const navigate = useNavigate();
  function create(): void {
    action.run(async (): Promise<void> => {
      const id = await newSettlement();
      await navigate({ to: "/settle/$potId", params: { potId: String(id) } });
    }, "Could not create a pot. Please try again.");
  }
  return (
    <div className="flex flex-col items-start gap-3">
      <Button type="button" disabled={action.pending} onClick={create}>
        {action.pending ? <Spinner data-icon="inline-start" /> : <PlusIcon data-icon="inline-start" />}
        {action.pending ? "Starting pot…" : "Start new pot"}
      </Button>
      <ActionError message={action.error} />
    </div>
  );
}
