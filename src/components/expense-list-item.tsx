import type { ExpenseView } from "@/db/expenses";
import type { ParticipantData } from "@/db/groups";
import { formatSats } from "@/domain/money";
import { Link } from "@tanstack/react-router";
import { ChevronRightIcon } from "lucide-react";
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
        className="flex items-center justify-between gap-4 rounded-md py-5 outline-none hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring"
      >
        <div className="flex min-w-0 flex-col gap-2">
          <p className="text-sm font-medium">
            {participants.find((person) => person.id === expense.payerId)?.name ?? "Participant"} paid{" "}
            {formatSats(expense.amountSats)} for {expense.description}
          </p>
          <p className="text-xs text-muted-foreground">
            {expense.date} · People involved:{" "}
            {expense.shares.length === participants.length
              ? "everyone"
              : expense.shares
                  .map(
                    (share) => participants.find((person) => person.id === share.participantId)?.name ?? "Participant",
                  )
                  .join(", ")}{" "}
            · Your share:{" "}
            {formatSats(expense.shares.find((share) => share.participantId === selectedParticipantId)?.amountSats ?? 0)}
          </p>
        </div>
        <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      </Link>
    </li>
  );
}
