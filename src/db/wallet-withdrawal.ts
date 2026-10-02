import { Effect } from "effect";

import { completeEventSettlement } from "./event-completion";
import { loadEventInvoices } from "./event-funding";
import { requireOrganizer } from "./event-settlement";
import { GroupError } from "./groups";

export const authorizeWalletWithdrawal = Effect.fn("authorizeWalletWithdrawal")(function* authorizeWalletWithdrawal(
  inviteKey: string,
  token: string | undefined,
) {
  const { group } = yield* requireOrganizer(inviteKey, token);
  if (group.arkAddress === null || group.status !== "settled") {
    return yield* new GroupError({ message: "Finish settlement before withdrawing leftover funds." });
  }
  const invoices = yield* loadEventInvoices(inviteKey);
  if (
    invoices.some((invoice) => invoice.status === "pending" || invoice.status === "paid") ||
    !(yield* completeEventSettlement(inviteKey, token))
  ) {
    return yield* new GroupError({ message: "Resolve outstanding contributions and payouts before withdrawing." });
  }
  yield* Effect.logInfo("wallet.withdrawal.authorized", { groupId: group.id });
  return { arkAddress: group.arkAddress };
});
