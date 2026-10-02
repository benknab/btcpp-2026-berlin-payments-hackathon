import { parseMainnetInvoice } from "@/domain/bolt11";
import { WalletTopUpRequest } from "@/domain/wallet-top-up";
import type { WalletTopUpInvoice } from "@/domain/wallet-top-up";
import { Receiver } from "@/server/bark/receiver";
import { Clock, Effect, Schema } from "effect";

import { Database } from "./database";
import { loadEventInvoices, reconcileEventInvoices } from "./event-funding";
import { eventInvoices } from "./event-payment-schema";
import { requireOrganizer } from "./event-settlement";
import { GroupError } from "./groups";

const issueReserveInvoice = Effect.fn("issueReserveInvoice")(function* issueReserveInvoice(input: {
  readonly address: string;
  readonly groupId: string;
  readonly ownerId: string;
  readonly amountSats: number;
}) {
  const receiver = yield* Receiver;
  const invoice = yield* receiver.invoice(input.address, input.amountSats);
  const details = yield* Effect.try({
    try: () => parseMainnetInvoice(invoice),
    catch: () => new GroupError({ message: "Invalid mainnet top-up invoice." }),
  });
  const now = yield* Clock.currentTimeMillis;
  if (details.amountSats !== input.amountSats || details.expiresAt <= now) {
    return yield* new GroupError({ message: "The top-up invoice has the wrong amount or has expired." });
  }
  yield* Effect.logInfo("wallet.top-up.invoice.created", {
    groupId: input.groupId,
    paymentHash: details.paymentHash,
    amountSats: details.amountSats,
    expiresAt: details.expiresAt,
  });
  const database = yield* Database;
  yield* database.insert(eventInvoices).values({
    ...details,
    invoice,
    groupId: input.groupId,
    participantId: input.ownerId,
    purpose: "fee-reserve",
    status: "pending",
    deliveredSats: 0,
  });
  return {
    invoice,
    paymentHash: details.paymentHash,
    amountSats: details.amountSats,
    expiresAt: details.expiresAt,
  } satisfies WalletTopUpInvoice;
});

export const walletTopUpInvoice = Effect.fn("walletTopUpInvoice")(function* walletTopUpInvoice(
  input: typeof WalletTopUpRequest.Type,
  token: string | undefined,
) {
  const valid = yield* Schema.decodeUnknownEffect(WalletTopUpRequest)(input);
  const { group, participants } = yield* requireOrganizer(valid.inviteKey, token);
  const address = group.arkAddress;
  const owner = participants.find((participant) => participant.position === 0);
  if (address === null || owner === undefined) {
    return yield* new GroupError({ message: "This event has no browser wallet or owner." });
  }
  yield* reconcileEventInvoices(valid.inviteKey);
  const database = yield* Database;
  return yield* database.transaction(() =>
    Effect.gen(function* prepareReserve() {
      const existing = (yield* loadEventInvoices(valid.inviteKey)).find(
        (entry) => entry.purpose === "fee-reserve" && (entry.status === "pending" || entry.status === "paid"),
      );
      return (
        existing ??
        (yield* issueReserveInvoice({ address, groupId: group.id, ownerId: owner.id, amountSats: valid.amountSats }))
      );
    }),
  );
});
