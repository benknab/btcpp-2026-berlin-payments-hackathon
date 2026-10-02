import { deliveredFor } from "@/domain/event-funding";
import { eq } from "drizzle-orm";
import { Effect } from "effect";

import { Database } from "./database";
import { requirePayoutContext } from "./event-payout-access";
import { loadEventPayouts } from "./event-payouts";
import { groups } from "./group-schema";

export const completeEventSettlement = Effect.fn("completeEventSettlement")(function* completeEventSettlement(
  inviteKey: string,
  token: string | undefined,
) {
  const database = yield* Database;
  return yield* database.transaction(() =>
    Effect.gen(function* finish() {
      const context = yield* requirePayoutContext(inviteKey, token);
      const payouts = yield* loadEventPayouts(inviteKey);
      const hasExcess = context.members.some(
        (member) => deliveredFor(member.participantId, context.invoices) > member.payInSats,
      );
      const allPaid = context.members.every(
        (member) =>
          member.receiveSats === 0 ||
          payouts.some(
            (payout) =>
              payout.participantId === member.participantId &&
              payout.status === "paid" &&
              payout.amountSats === member.receiveSats,
          ),
      );
      if (!allPaid || hasExcess) {
        yield* Effect.logWarning("settlement.incomplete", { groupId: context.group.id, allPaid, hasExcess });
        return false;
      }
      yield* database.update(groups).set({ status: "settled" }).where(eq(groups.id, context.group.id));
      yield* Effect.logInfo("settlement.completed", { groupId: context.group.id, payouts: payouts.length });
      return true;
    }),
  );
});
