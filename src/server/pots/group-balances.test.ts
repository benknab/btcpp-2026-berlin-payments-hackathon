import { getOverview } from "@/db/balances";
import { groupSettlementPage } from "@/db/group-settlements";
import { expect, it } from "@effect/vitest";
import { Effect } from "effect";

import { executeGroupPayment } from "./group-service";
import { fixture, setup, TestControls } from "./group-service.fixture";

it.effect("reflects managed deposits and payouts in the event's remaining balances", () =>
  fixture(() =>
    Effect.gen(function* managedBalances() {
      expect.hasAssertions();
      const group = yield* setup();
      const page = yield* groupSettlementPage(group.inviteKey);
      const action = { inviteKey: group.inviteKey, organizerToken: group.organizerToken };
      const closed = yield* executeGroupPayment({ ...action, kind: "close", fingerprint: page.preview.fingerprint });
      const debtor = closed.pot?.participants.find((person) => person.payInSat > 0);
      if (debtor === undefined) {
        yield* Effect.die("Missing debtor");
        return;
      }
      (yield* TestControls).receive(debtor.depositAddress, debtor.payInSat);
      yield* executeGroupPayment({ ...action, kind: "refresh" });
      expect((yield* getOverview(group.inviteKey)).balances.map((balance) => balance.settlementSats)).toStrictEqual([
        4000, 1000, 0,
      ]);
      yield* executeGroupPayment({ ...action, kind: "pay" });
      expect((yield* getOverview(group.inviteKey)).balances.map((balance) => balance.settlementSats)).toStrictEqual([
        0, 0, 0,
      ]);
    }),
  ),
);
