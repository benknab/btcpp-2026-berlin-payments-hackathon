import { calculateObligations, Sats } from "@/lib/pot";
import { MAX_SETTLEMENT_DEBTS, MAX_SETTLEMENT_USERS, SettlementSetup } from "@/lib/settlement";
import { Effect, Schema } from "effect";

export interface DraftUser {
  readonly id: string;
  readonly name: string;
  readonly arkAddress: string;
}

export interface DraftDebt {
  readonly id: string;
  readonly from: string;
  readonly to: string;
  readonly amount: string;
}

export interface SettlementDraft {
  readonly users: readonly DraftUser[];
  readonly debts: readonly DraftDebt[];
}

export const initialSettlementDraft: SettlementDraft = {
  users: [
    { id: "alice", name: "Alice", arkAddress: "" },
    { id: "bob", name: "Bob", arkAddress: "" },
  ],
  debts: [{ id: "debt-1", from: "alice", to: "bob", amount: "" }],
};

const Amount = Schema.NumberFromString.pipe(
  Schema.check(Schema.isInt(), Schema.isGreaterThan(0), Schema.isLessThanOrEqualTo(Number.MAX_SAFE_INTEGER)),
);

export const prepareSettlementDraft = Effect.fn("prepareSettlementDraft")(function* prepareSettlementDraft(
  draft: SettlementDraft,
) {
  const debts = yield* Effect.forEach(
    draft.debts,
    (debt) =>
      Schema.decodeUnknownEffect(Amount)(debt.amount).pipe(
        Effect.map((amountSat) => ({ from: debt.from, to: debt.to, amountSat })),
      ),
    { concurrency: 1 },
  );
  const setup = yield* Schema.decodeUnknownEffect(SettlementSetup)({
    users: draft.users.map((user) => ({ ...user, name: user.name.trim(), arkAddress: user.arkAddress.trim() })),
    debts,
  });
  const obligations = yield* calculateObligations({ ...setup, id: "preview" });
  return { setup, obligations };
});

export function validDraftAmount(value: string): boolean {
  return Schema.is(Sats)(Number(value)) && Number(value) > 0;
}

export function removeDraftUser(draft: SettlementDraft, id: string): SettlementDraft {
  return {
    users: draft.users.filter((user): boolean => user.id !== id),
    debts: draft.debts.filter((debt): boolean => debt.from !== id && debt.to !== id),
  };
}

export function canAddDraftUser(draft: SettlementDraft): boolean {
  return draft.users.length < MAX_SETTLEMENT_USERS;
}

export function canAddDraftDebt(draft: SettlementDraft): boolean {
  return draft.debts.length < MAX_SETTLEMENT_DEBTS;
}
