import { Button, buttonVariants } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

export function ExpenseFormActions({
  inviteKey,
  pending,
  disabled,
  editing,
}: {
  readonly inviteKey: string;
  readonly pending: boolean;
  readonly disabled: boolean;
  readonly editing: boolean;
}): ReactNode {
  const label = editing ? "Save changes" : "Add expense";
  return (
    <div className="flex flex-wrap gap-2">
      <Button type="submit" disabled={disabled}>
        {pending && <Spinner data-icon="inline-start" />}
        {pending ? "Saving…" : label}
      </Button>
      <Link to="/groups/$inviteKey" params={{ inviteKey }} className={buttonVariants({ variant: "outline" })}>
        Done
      </Link>
    </div>
  );
}
