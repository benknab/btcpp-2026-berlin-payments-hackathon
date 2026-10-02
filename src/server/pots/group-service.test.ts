import { addExpense, deleteExpense, editExpense } from "@/db/expenses";
import { requireStandalonePot, requireUnreservedWallet } from "@/db/group-payment-access";
import { groupSettlementPage, lockGroupSettlement } from "@/db/group-settlements";
import { createGroup, getGroup } from "@/db/groups";
import { issuePersonalLink, savePersonalAddress } from "@/db/participant-payments";
import { expect, it } from "@effect/vitest";
import { Effect } from "effect";

import { groupPaymentRequest } from "./group-request";
import { executeGroupPayment } from "./group-service";
import { fixture, setup, TestControls } from "./group-service.fixture";

it.effect("requires addresses, organizer access, and a current reviewed snapshot before locking", () =>
  fixture(() =>
    Effect.gen(function* test() {
      const group = yield* setup(false);
      const page = yield* groupSettlementPage(group.inviteKey);
      expect(page.preview.missingNames).toStrictEqual(["Alice", "Bob", "Carol"]);
      const action = {
        kind: "close",
        inviteKey: group.inviteKey,
        fingerprint: page.preview.fingerprint,
      } as const;
      expect(yield* Effect.result(executeGroupPayment(action))).toMatchObject({ _tag: "Failure" });
      expect(
        yield* Effect.result(executeGroupPayment({ ...action, organizerToken: group.organizerToken })),
      ).toMatchObject({ _tag: "Failure" });
      expect((yield* getGroup(group.inviteKey)).group.status).toBe("open");
      for (const [index, person] of (yield* getGroup(group.inviteKey)).participants.entries()) {
        const link = yield* issuePersonalLink(group.inviteKey, person.id, group.organizerToken);
        yield* savePersonalAddress({ accessKey: link.accessKey, arkAddress: `ark1${"q".repeat(index + 1)}` });
      }
      expect(
        yield* Effect.result(executeGroupPayment({ ...action, organizerToken: group.organizerToken })),
      ).toMatchObject({ _tag: "Failure" });
      const { preview } = yield* groupSettlementPage(group.inviteKey);
      yield* editExpense({ ...group.dinner, version: 1, amountSats: 12_000 });
      expect(
        yield* Effect.result(
          executeGroupPayment({ ...action, fingerprint: preview.fingerprint, organizerToken: group.organizerToken }),
        ),
      ).toMatchObject({ _tag: "Failure" });
      expect((yield* getGroup(group.inviteKey)).group.status).toBe("open");
    }),
  ),
);

it.effect("locks expenses and addresses, collects net debts, and confirms exact payouts once", () =>
  fixture(() =>
    Effect.gen(function* test() {
      const group = yield* setup();
      const page = yield* groupSettlementPage(group.inviteKey);
      const action = { inviteKey: group.inviteKey, organizerToken: group.organizerToken };
      const closed = yield* executeGroupPayment({
        ...action,
        kind: "close",
        fingerprint: page.preview.fingerprint,
      });
      expect(closed.status).toBe("settling");
      expect(closed.pot?.participants.map((person) => [person.payInSat, person.receiveSat])).toStrictEqual([
        [0, 4000],
        [0, 1000],
        [5000, 0],
      ]);
      expect(yield* Effect.result(editExpense({ ...group.dinner, version: 1 }))).toMatchObject({ _tag: "Failure" });
      expect(
        yield* Effect.result(
          deleteExpense({ inviteKey: group.inviteKey, expenseId: group.dinner.expenseId, version: 1 }),
        ),
      ).toMatchObject({ _tag: "Failure" });
      expect(
        yield* Effect.result(addExpense({ ...group.dinner, expenseId: "00000000-0000-4000-8000-000000000003" })),
      ).toMatchObject({ _tag: "Failure" });
      expect(
        yield* Effect.result(savePersonalAddress({ accessKey: group.links[0] ?? "", arkAddress: "ark1ace" })),
      ).toMatchObject({ _tag: "Failure" });
      expect(yield* Effect.result(requireStandalonePot(group.groupId))).toMatchObject({ _tag: "Failure" });
      expect(yield* Effect.result(requireUnreservedWallet("isolated-test-wallet"))).toMatchObject({ _tag: "Failure" });
      const controls = yield* TestControls;
      const payer = closed.pot?.participants.find((person) => person.payInSat > 0);
      if (payer === undefined) {
        yield* Effect.die("Missing payer");
        return;
      }
      controls.receive(payer.depositAddress, 5000, "pending");
      expect(yield* Effect.result(executeGroupPayment({ ...action, kind: "pay" }))).toMatchObject({ _tag: "Failure" });
      controls.receive(payer.depositAddress, 2000);
      const partial = yield* executeGroupPayment({ ...action, kind: "refresh" });
      expect(partial.pot?.participants.find((person) => person.payInSat > 0)?.receivedSat).toBe(2000);
      expect(yield* Effect.result(executeGroupPayment({ ...action, kind: "pay" }))).toMatchObject({ _tag: "Failure" });
      expect(
        yield* Effect.result(executeGroupPayment({ ...action, organizerToken: undefined, kind: "pay" })),
      ).toMatchObject({ _tag: "Failure" });
      expect(controls.sends()).toBe(0);
      controls.receive(payer.depositAddress, 3000);
      controls.loseSendResponse();
      expect(yield* Effect.result(executeGroupPayment({ ...action, kind: "pay" }))).toMatchObject({ _tag: "Failure" });
      expect((yield* groupSettlementPage(group.inviteKey)).pot?.participants[0]?.payoutStatus).toBe("sending");
      const settled = yield* executeGroupPayment({ ...action, kind: "pay" });
      expect(settled.status).toBe("settled");
      expect(
        settled.pot?.participants
          .filter((person) => person.receiveSat > 0)
          .every((person) => person.payoutStatus === "paid"),
      ).toBe(true);
      expect(controls.sends()).toBe(2);
      yield* executeGroupPayment({ ...action, kind: "pay" });
      expect(controls.sends()).toBe(2);
    }),
  ),
);

it.effect(
  "persists a wallet reservation before initialization and resumes after failure without changing the snapshot",
  () =>
    fixture(() =>
      Effect.gen(function* test() {
        const group = yield* setup();
        const page = yield* groupSettlementPage(group.inviteKey);
        const controls = yield* TestControls;
        const action = {
          kind: "close",
          inviteKey: group.inviteKey,
          organizerToken: group.organizerToken,
          fingerprint: page.preview.fingerprint,
        } as const;
        controls.failAddress(true);
        expect(yield* Effect.result(executeGroupPayment(action))).toMatchObject({ _tag: "Failure" });
        const checkpoint = yield* groupSettlementPage(group.inviteKey);
        expect(checkpoint.status).toBe("settling");
        expect(checkpoint.pot).toBeNull();
        expect(checkpoint.preview.snapshot).toStrictEqual(page.preview.snapshot);
        const other = yield* createGroup({
          name: "Other",
          organizerName: "Dave",
          organizerLnurl: "dave@wallet.com",
          participantNames: ["Eve"],
          arkAddress: "ark1ace",
        });
        expect(
          yield* Effect.result(
            executeGroupPayment({ ...action, inviteKey: other.inviteKey, organizerToken: other.organizerToken }),
          ),
        ).toMatchObject({ _tag: "Failure" });
        expect((yield* getGroup(other.inviteKey)).group.status).toBe("open");
        controls.failAddress(false);
        const resumed = yield* executeGroupPayment(action);
        expect(resumed.pot?.totalSat).toBe(5000);
        expect((yield* executeGroupPayment(action)).pot).toStrictEqual(resumed.pot);
      }),
    ),
);

it.effect("closes all-square groups without addresses or wallet configuration", () =>
  fixture(() =>
    Effect.gen(function* test() {
      const group = yield* createGroup({
        name: "Empty",
        organizerName: "Alice",
        organizerLnurl: "alice@wallet.com",
        participantNames: ["Bob"],
        arkAddress: "ark1ace",
      });
      const page = yield* groupSettlementPage(group.inviteKey);
      const settled = yield* groupPaymentRequest({
        kind: "close",
        inviteKey: group.inviteKey,
        organizerToken: group.organizerToken,
        fingerprint: page.preview.fingerprint,
      });
      expect(settled.status).toBe("settled");
      expect(settled.pot).toBeNull();
      expect((yield* TestControls).sends()).toBe(0);
      expect(
        yield* Effect.result(
          lockGroupSettlement({
            inviteKey: group.inviteKey,
            fingerprint: page.preview.fingerprint,
            walletFingerprint: "wrong-wallet",
            organizerToken: group.organizerToken,
          }),
        ),
      ).toMatchObject({ _tag: "Failure" });
    }),
  ),
);

it.effect("uses the managed wallet for a group payment request and resumes its frozen pot", () =>
  fixture(() =>
    Effect.gen(function* test() {
      const group = yield* setup();
      const page = yield* groupSettlementPage(group.inviteKey);
      const action = { inviteKey: group.inviteKey, organizerToken: group.organizerToken };
      const closed = yield* groupPaymentRequest({
        ...action,
        kind: "close",
        fingerprint: page.preview.fingerprint,
      });
      expect(closed.pot?.id).toBe(group.groupId);
      expect((yield* groupPaymentRequest({ ...action, kind: "refresh" })).pot?.id).toBe(group.groupId);
    }),
  ),
);
