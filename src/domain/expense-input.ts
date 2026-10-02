import { DateTime, Option, Schema } from "effect";

import { ExpenseSplitSchema } from "./expense-split";
import { EntityId, InviteKey } from "./group-input";
import { PositiveSats } from "./money";

export const MAX_DESCRIPTION = 120;
const Description = Schema.String.pipe(
  Schema.check(Schema.isTrimmed(), Schema.isMinLength(1), Schema.isMaxLength(MAX_DESCRIPTION)),
);
export const ExpenseDate = Schema.String.pipe(
  Schema.check(
    Schema.isPattern(/^\d{4}-\d{2}-\d{2}$/u),
    Schema.makeFilter((value) => {
      const parsed = DateTime.make(value);
      return Option.isSome(parsed) && DateTime.formatIsoDateUtc(parsed.value) === value;
    }),
  ),
);
const Version = Schema.Number.pipe(Schema.check(Schema.isInt(), Schema.isGreaterThan(0)));

export const NewExpense = Schema.Struct({
  inviteKey: InviteKey,
  expenseId: EntityId,
  payerId: EntityId,
  description: Description,
  amountSats: PositiveSats,
  date: ExpenseDate,
  split: Schema.optionalKey(ExpenseSplitSchema),
});
export const EditExpense = Schema.Struct({ ...NewExpense.fields, version: Version });
export const ExpenseRequest = Schema.Struct({ inviteKey: InviteKey, expenseId: EntityId });
export const DeleteExpense = Schema.Struct({ ...ExpenseRequest.fields, version: Version });
