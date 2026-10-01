import { ActionError } from "@/components/action-error";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAction } from "@/components/use-action";
import type { ParticipantData } from "@/db/groups";
import { chooseParticipant } from "@/server/groups";
import { useRouter } from "@tanstack/react-router";
import type { ReactNode } from "react";

interface ChooserProps {
  readonly inviteKey: string;
  readonly groupName: string;
  readonly participants: readonly ParticipantData[];
  readonly onChosen: () => void;
}

export function ParticipantChooser({ inviteKey, groupName, participants, onChosen }: ChooserProps): ReactNode {
  const action = useAction();
  const router = useRouter();

  function choose(participantId: string): void {
    action.run(async (): Promise<void> => {
      await chooseParticipant({ data: { inviteKey, participantId } });
      await router.invalidate();
      onChosen();
    }, "Could not select your name. Try again.");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Who are you?</CardTitle>
        <CardDescription>You’re invited to {groupName}. Choose your name to see your share.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
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
        <p className="text-xs text-muted-foreground">This selects your view, not a verified payment identity.</p>
        <ActionError message={action.error} />
      </CardContent>
    </Card>
  );
}
