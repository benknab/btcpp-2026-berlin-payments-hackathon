import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import type { ExpenseView } from "@/db/expenses";
import type { ParticipantData } from "@/db/groups";
import { formatSats } from "@/domain/money";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

export function ExpenseList({
  inviteKey,
  entries,
  participants,
  selectedParticipantId,
  locked,
}: {
  readonly inviteKey: string;
  readonly entries: readonly ExpenseView[];
  readonly participants: readonly ParticipantData[];
  readonly selectedParticipantId: string | null;
  readonly locked: boolean;
}): ReactNode {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Expenses</CardTitle>
        <CardDescription>
          {entries.length} shared {entries.length === 1 ? "expense" : "expenses"}. Paid out of pocket.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {entries.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>Your group is ready</EmptyTitle>
              <EmptyDescription>Add the first expense to start splitting.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <ul className="flex flex-col divide-y">
            {entries.map((expense) => (
              <li key={expense.id}>
                <Link
                  to="/groups/$inviteKey/expenses/$expenseId"
                  params={{ inviteKey, expenseId: expense.id }}
                  className="flex flex-col gap-1 rounded-md py-4 outline-none hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <p className="text-sm font-medium">
                    {participants.find((person) => person.id === expense.payerId)?.name ?? "Participant"} paid{" "}
                    {formatSats(expense.amountSats)} for {expense.description}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {expense.date} · Split between {expense.shares.length} people · Your share:{" "}
                    {formatSats(
                      expense.shares.find((share) => share.participantId === selectedParticipantId)?.amountSats ?? 0,
                    )}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
        {locked ? null : (
          <Link
            to="/groups/$inviteKey/expenses/new"
            params={{ inviteKey }}
            className={buttonVariants({ className: "self-start" })}
          >
            Add expense
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
