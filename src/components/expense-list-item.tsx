import type { ExpenseView } from "@/db/expenses";
import type { ParticipantData } from "@/db/groups";
import { formatSats } from "@/domain/money";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

interface ExpenseListItemProps {
  readonly inviteKey: string;
  readonly expense: ExpenseView;
  readonly participants: readonly ParticipantData[];
  readonly selectedParticipantId: string | null;
}

export function ExpenseListItem({
  inviteKey,
  expense,
  participants,
  selectedParticipantId,
}: ExpenseListItemProps): ReactNode {
  return (
    <li>
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
          {formatSats(expense.shares.find((share) => share.participantId === selectedParticipantId)?.amountSats ?? 0)}
        </p>
      </Link>
    </li>
  );
}
