import { ExpenseSplitPeople } from "@/components/expense-split-people";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ExpenseSplitState } from "@/components/use-expense-split";
import type { ParticipantData } from "@/db/groups";
import { SplitModeSchema } from "@/domain/expense-split";
import { Schema } from "effect";
import type { ReactNode } from "react";

export function ExpenseCustomSplit({
  split,
  disabled,
  participants,
}: {
  readonly split: ExpenseSplitState;
  readonly disabled: boolean;
  readonly participants: readonly ParticipantData[];
}): ReactNode {
  return (
    <Tabs
      value={split.draft.mode}
      onValueChange={(value: unknown) => {
        if (Schema.is(SplitModeSchema)(value)) {
          split.changeMode(value);
        }
      }}
    >
      <TabsList variant="line" className="w-full">
        <TabsTrigger value="equal" disabled={disabled}>
          Equally
        </TabsTrigger>
        <TabsTrigger value="amount" disabled={disabled}>
          Amount
        </TabsTrigger>
        <TabsTrigger value="shares" disabled={disabled}>
          Shares
        </TabsTrigger>
        <TabsTrigger value="percent" disabled={disabled}>
          Percent
        </TabsTrigger>
      </TabsList>
      <TabsContent value={split.draft.mode}>
        <ExpenseSplitPeople split={split} participants={participants} disabled={disabled} />
      </TabsContent>
    </Tabs>
  );
}
