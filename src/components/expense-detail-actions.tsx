import { ExpenseDelete } from "@/components/expense-delete";
import { buttonVariants } from "@/components/ui/button";
import type { ExpenseView } from "@/db/expenses";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

interface ExpenseDetailActionsProps {
  readonly inviteKey: string;
  readonly expense: ExpenseView;
  readonly open: boolean;
}

export function ExpenseDetailActions({ inviteKey, expense, open }: ExpenseDetailActionsProps): ReactNode {
  return (
    <>
      {open ? (
        <>
          <Link
            to="/groups/$inviteKey/expenses/$expenseId/edit"
            params={{ inviteKey, expenseId: expense.id }}
            className={buttonVariants({ variant: "outline" })}
          >
            Edit expense
          </Link>
          <ExpenseDelete inviteKey={inviteKey} expense={expense} />
        </>
      ) : (
        <p>Expenses are locked for settlement.</p>
      )}
      <Link to="/groups/$inviteKey" params={{ inviteKey }} className={buttonVariants({ variant: "ghost" })}>
        Back to group
      </Link>
    </>
  );
}
