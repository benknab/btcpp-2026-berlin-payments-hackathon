import { parseMainnetInvoice } from "@/domain/bolt11";
import { WalletTopUpRequest } from "@/domain/wallet-top-up";
import type { WalletTopUpInvoice } from "@/domain/wallet-top-up";
import { Receiver } from "@/server/bark/receiver";
import { Clock, Effect, Schema } from "effect";

import { requireOrganizer } from "./event-settlement";
import { GroupError } from "./groups";

export const walletTopUpInvoice = Effect.fn("walletTopUpInvoice")(function* walletTopUpInvoice(
  input: typeof WalletTopUpRequest.Type,
  token: string | undefined,
) {
  const valid = yield* Schema.decodeUnknownEffect(WalletTopUpRequest)(input);
  const { group } = yield* requireOrganizer(valid.inviteKey, token);
  if (group.arkAddress === null) {
    return yield* new GroupError({ message: "This event has no browser wallet." });
  }
  const receiver = yield* Receiver;
  const invoice = yield* receiver.invoice(group.arkAddress, valid.amountSats);
  const details = yield* Effect.try({
    try: () => parseMainnetInvoice(invoice),
    catch: () => new GroupError({ message: "Invalid mainnet top-up invoice." }),
  });
  const now = yield* Clock.currentTimeMillis;
  if (details.amountSats !== valid.amountSats || details.expiresAt <= now) {
    return yield* new GroupError({ message: "The top-up invoice has the wrong amount or has expired." });
  }
  yield* Effect.logInfo("wallet.top-up.invoice.created", {
    groupId: group.id,
    paymentHash: details.paymentHash,
    amountSats: details.amountSats,
    expiresAt: details.expiresAt,
  });
  // Barkd persists and delivers this receipt; it is not a participant contribution.
  return {
    invoice,
    paymentHash: details.paymentHash,
    amountSats: details.amountSats,
    expiresAt: details.expiresAt,
  } satisfies WalletTopUpInvoice;
});
