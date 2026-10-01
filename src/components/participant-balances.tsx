import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ParticipantData } from "@/db/groups";
import type { ParticipantBalance } from "@/domain/accounting";
import { formatSats } from "@/domain/money";
import type { ReactNode } from "react";

function describeBalance(amount: number): string {
  if (amount === 0) {
    return "All square";
  }
  return amount > 0 ? `Owed ${formatSats(amount)}` : `Owes ${formatSats(Math.abs(amount))}`;
}

export function ParticipantBalances({
  participants,
  balances,
}: {
  readonly participants: readonly ParticipantData[];
  readonly balances: readonly ParticipantBalance[];
}): ReactNode {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Everyone’s share</CardTitle>
        <CardDescription>Expense balances before contributions and fees.</CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="flex flex-col gap-3 text-sm">
          {participants.map((person) => (
            <div key={person.id} className="flex flex-wrap justify-between gap-2">
              <dt>{person.name}</dt>
              <dd className="tabular-nums">
                {describeBalance(
                  balances.find((balance) => balance.participantId === person.id)?.expenseBalanceSats ?? 0,
                )}
              </dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}
