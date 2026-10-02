import { ParticipantLink } from "@/components/settlement/participant-link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { SettlementSnapshot } from "@/domain/group-settlement";
import type { ReactNode } from "react";

export function PersonalLinks({
  inviteKey,
  origin,
  users,
}: Readonly<{ inviteKey: string; origin: string; users: SettlementSnapshot["users"] }>): ReactNode {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Personal address setup</CardTitle>
        <CardDescription>
          Share each link privately with that person—including yourself. No account needed.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {users.map((person) => (
          <ParticipantLink
            key={person.id}
            inviteKey={inviteKey}
            origin={origin}
            participantId={person.id}
            name={person.name}
          />
        ))}
        <p className="text-xs text-muted-foreground">
          Generating a link replaces any earlier link for that person, without changing their saved address. Links are
          only shown here when generated; copy them before leaving. Keep them private.
        </p>
      </CardContent>
    </Card>
  );
}
