import { describe, expect, it } from "@effect/vitest";
import { Effect, Schema } from "effect";

import type { PotError } from "./pot";
import { SettlementPay } from "./settlement";
import { initialSettlementDraft, prepareSettlementDraft, removeDraftUser } from "./settlement-draft";
import type { SettlementDraft } from "./settlement-draft";

const draft: SettlementDraft = {
  users: [
    { id: "alice", name: " Alice ", arkAddress: " tark1ace " },
    { id: "bob", name: "Bob", arkAddress: "tark1q0q" },
  ],
  debts: [
    { id: "one", from: "alice", to: "bob", amount: "9000" },
    { id: "two", from: "bob", to: "alice", amount: "1000" },
  ],
};

describe("settlement form validation", (): void => {
  it.effect(
    "parses whole sats, trims names/addresses, and previews net debts",
    (): Effect.Effect<void, Schema.SchemaError | PotError> =>
      Effect.gen(function* test() {
        const prepared = yield* prepareSettlementDraft(draft);
        expect(prepared.setup.users[0]).toStrictEqual({ id: "alice", name: "Alice", arkAddress: "tark1ace" });
        expect(prepared.obligations).toStrictEqual([
          { userId: "alice", payInSat: 8000, receiveSat: 0 },
          { userId: "bob", payInSat: 0, receiveSat: 8000 },
        ]);
      }),
  );

  it.effect.each(["", "0", "-1", "1.5", "Infinity", "9007199254740992"])(
    "rejects invalid form amount %s",
    (amount): Effect.Effect<void> =>
      Effect.gen(function* test() {
        const result = yield* Effect.result(
          prepareSettlementDraft({ ...draft, debts: [{ id: "one", from: "alice", to: "bob", amount }] }),
        );
        expect(result._tag).toBe("Failure");
      }),
  );

  it.effect("requires actual participants/addresses and explicit final payout approval", (): Effect.Effect<void> =>
    Effect.gen(function* test() {
      expect((yield* Effect.result(prepareSettlementDraft(initialSettlementDraft)))._tag).toBe("Failure");
      expect((yield* Effect.result(Schema.decodeUnknownEffect(SettlementPay)({ id: 1, reviewed: false })))._tag).toBe(
        "Failure",
      );
    }),
  );

  it("removes a participant's debts rather than leaving dangling references", (): void => {
    expect(removeDraftUser(draft, "alice")).toStrictEqual({ users: [draft.users[1]], debts: [] });
  });
});
