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
  const payer = participants.find((person) => person.id === expense.payerId)?.name ?? "Participant";
  const yourShare = expense.shares.find((share) => share.participantId === selectedParticipantId)?.amountSats ?? 0;
  return (
    <li>
      <Link
        to="/groups/$inviteKey/expenses/$expenseId"
        params={{ inviteKey, expenseId: expense.id }}
        className="-mx-3 flex items-start justify-between gap-3 rounded-lg px-3 py-4 transition-colors duration-150 outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <div className="flex min-w-0 flex-col gap-1.5">
          <p className="font-medium break-words">{expense.description}</p>
          <p className="text-xs text-muted-foreground">
            Paid by {payer} · {expense.date}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5 text-right tabular-nums">
          <span className="font-semibold">{formatSats(expense.amountSats)}</span>
          <span className="text-xs text-muted-foreground">Your share: {formatSats(yourShare)}</span>
        </div>
      </Link>
    </li>
  );
}
