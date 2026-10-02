import { EmptyState } from "@/components/empty-state";
import { ExpenseListItem } from "@/components/expense-list-item";
import { SectionCard } from "@/components/section-card";
import { buttonVariants } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { ExpenseView } from "@/db/expenses";
import type { ParticipantData } from "@/db/groups";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useState } from "react";

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
  const [query, setQuery] = useState("");
  const matches = entries.filter((expense) =>
    [expense.description, expense.date, participants.find((person) => person.id === expense.payerId)?.name ?? ""]
      .join(" ")
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  );
  return (
    <SectionCard
      title="Expenses"
      contentClassName="flex flex-col gap-4"
      action={
        !locked && (
          <Link to="/groups/$inviteKey/expenses/new" params={{ inviteKey }} className={buttonVariants()}>
            Add expense
          </Link>
        )
      }
    >
      {entries.length > 0 && (
        <Field>
          <FieldLabel htmlFor="expense-search" className="sr-only">
            Search expenses
          </FieldLabel>
          <Input
            id="expense-search"
            type="search"
            placeholder="Search expenses"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
            }}
          />
        </Field>
      )}
      {matches.length === 0 ? (
        <EmptyState title={entries.length === 0 ? "No expenses" : "No matching expenses"} />
      ) : (
        <ul className="flex flex-col divide-y">
          {matches.map((expense) => (
            <ExpenseListItem
              key={expense.id}
              inviteKey={inviteKey}
              expense={expense}
              participants={participants}
              selectedParticipantId={selectedParticipantId}
            />
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
