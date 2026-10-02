import { ActionError } from "@/components/action-error";
import { SectionCard } from "@/components/section-card";
import { Button } from "@/components/ui/button";
import { useAction } from "@/components/use-action";
import type { ParticipantData } from "@/db/groups";
import { chooseParticipant } from "@/server/groups";
import { useRouter } from "@tanstack/react-router";
import type { ReactNode } from "react";

interface ChooserProps {
  readonly inviteKey: string;
  readonly participants: readonly ParticipantData[];
}

export function ParticipantChooser({ inviteKey, participants }: ChooserProps): ReactNode {
  const action = useAction();
  const router = useRouter();

  function choose(participantId: string): void {
    action.run(async (): Promise<void> => {
      await chooseParticipant({ data: { inviteKey, participantId } });
      await router.invalidate();
    }, "Could not select your name. Try again.");
  }

  return (
    <SectionCard title="Select your name" contentClassName="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {participants.map((participant) => (
          <Button
            key={participant.id}
            variant="outline"
            disabled={action.pending}
            onClick={() => {
              choose(participant.id);
            }}
          >
            {participant.name}
          </Button>
        ))}
      </div>
      <ActionError message={action.error} />
    </SectionCard>
  );
}
