import { ActionError } from "@/components/action-error";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useAction } from "@/components/use-action";
import type { ExpenseView } from "@/db/expenses";
import { removeExpense } from "@/server/expenses";
import { useNavigate, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import type { ReactNode } from "react";

export function ExpenseDelete({
  inviteKey,
  expense,
}: {
  readonly inviteKey: string;
  readonly expense: ExpenseView;
}): ReactNode {
  const action = useAction();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const router = useRouter();
  function handleDelete(): void {
    action.run(async (): Promise<void> => {
      await removeExpense({ data: { inviteKey, expenseId: expense.id, version: expense.version } });
      setOpen(false);
      await navigate({ to: "/groups/$inviteKey", params: { inviteKey } });
      await router.invalidate();
    }, "Could not delete this expense. Refresh if it changed or settlement started.");
  }
  return (
    <AlertDialog
      open={open}
      onOpenChange={(value) => {
        if (!action.pending) {
          setOpen(value);
        }
      }}
    >
      <AlertDialogTrigger render={<Button variant="destructive" />}>Delete expense</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {expense.description}?</AlertDialogTitle>
          <AlertDialogDescription>
            This removes the expense and its shares from everyone’s balance. It cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <ActionError message={action.error} />
        <AlertDialogFooter>
          <AlertDialogCancel disabled={action.pending}>Keep expense</AlertDialogCancel>
          <AlertDialogAction variant="destructive" disabled={action.pending} onClick={handleDelete}>
            {action.pending ? "Deleting…" : "Delete expense"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
