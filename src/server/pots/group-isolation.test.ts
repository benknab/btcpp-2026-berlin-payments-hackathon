import { groupSettlementPage, lockGroupSettlement } from "@/db/group-settlements";
import { createGroup, getGroup } from "@/db/groups";
import { expect, it } from "@effect/vitest";
import { Effect } from "effect";

import { fixture, setup } from "./group-service.fixture";
import { createPot } from "./service";
import { PotStore } from "./store";
import { actionResult } from "./ui-actions";

it.effect("atomically keeps standalone pot creation and payouts out of reserved group wallets", () =>
  fixture(() =>
    Effect.gen(function* test() {
      const group = yield* setup();
      const { preview } = yield* groupSettlementPage(group.inviteKey);
      const snapshot = yield* lockGroupSettlement({
        inviteKey: group.inviteKey,
        fingerprint: preview.fingerprint,
        organizerToken: group.organizerToken,
        walletFingerprint: "isolated-test-wallet",
      });
      expect(yield* Effect.result(createPot({ ...snapshot, id: "standalone" }))).toMatchObject({ _tag: "Failure" });
      const store = yield* PotStore;
      expect(yield* store.findByWallet("isolated-test-wallet")).toBeNull();
      const pot = yield* createPot(snapshot);
      expect(pot.id).toBe(group.groupId);
      expect(yield* actionResult({ kind: "open" })).toMatchObject({ ok: false, pot: null });
      expect(yield* actionResult({ kind: "pay", id: pot.id })).toMatchObject({ ok: false, pot: null });
      expect(yield* actionResult({ kind: "refresh", id: pot.id })).toMatchObject({ ok: false, pot: null });
      const other = yield* createGroup({ name: "Other", organizerName: "Dave", participantNames: ["Eve"] });
      const otherPage = yield* groupSettlementPage(other.inviteKey);
      expect(
        yield* Effect.result(
          lockGroupSettlement({
            inviteKey: other.inviteKey,
            fingerprint: otherPage.preview.fingerprint,
            organizerToken: other.organizerToken,
            walletFingerprint: "isolated-test-wallet",
          }),
        ),
      ).toMatchObject({ _tag: "Failure" });
      expect((yield* getGroup(other.inviteKey)).group.status).toBe("open");
    }),
  ),
);
