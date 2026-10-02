import { parseMainnetInvoice } from "@/domain/bolt11";
import { Sats } from "@/domain/money";
import { observe } from "@/lib/telemetry";
import { Configuration, LightningApi, ResponseError, WalletApi } from "@secondts/barkd";
import { Config, Context, Effect, Layer, Redacted, Schema } from "effect";

import { BarkError } from "./error";

export { BarkError } from "./error";

const TIMEOUT_MS = 30_000;
const Receipt = Schema.Struct({
  paymentHash: Schema.String,
  amountSat: Sats,
  state: Schema.Literals(["awaiting-payment", "htlcs-ready", "preimage-revealed", "delivering", "settled"]),
});
export interface ReceiverOperations {
  readonly invoice: (address: string, amountSats: number) => Effect.Effect<string, BarkError>;
  readonly receipt: (paymentHash: string) => Effect.Effect<typeof Receipt.Type, BarkError>;
}
export class Receiver extends Context.Service<Receiver, ReceiverOperations>()("payments/Receiver") {}

function request<Value>(
  operation: string,
  run: (signal: Readonly<AbortSignal>) => Promise<Value>,
): Effect.Effect<Value, BarkError> {
  return observe(
    `receiver.${operation}`,
    Effect.tryPromise({
      try: (signal: Readonly<AbortSignal>) => run(AbortSignal.any([signal, AbortSignal.timeout(TIMEOUT_MS)])),
      catch: (error) =>
        new BarkError({
          operation,
          message:
            error instanceof ResponseError
              ? `Bark HTTP ${error.response.status}`
              : "The mainnet receiving wallet is unavailable.",
        }),
    }).pipe(
      Effect.tapError((error: Pick<BarkError, "message">) =>
        Effect.logWarning("receiver.request.failed", { operation, reason: error.message }),
      ),
    ),
  );
}

export function makeReceiver(basePath: string, token: Readonly<Redacted.Redacted>): ReceiverOperations {
  const configuration = new Configuration({ basePath, accessToken: Redacted.value(token) });
  const lightning = new LightningApi(configuration);
  const wallet = new WalletApi(configuration);
  return {
    invoice: (address, amountSats) =>
      Effect.gen(function* createInvoice() {
        const info = yield* request("ark-info", (signal) => wallet.arkInfo({ signal }));
        if (info.network !== "bitcoin") {
          return yield* new BarkError({ operation: "receiver", message: "The receiving wallet must use mainnet." });
        }
        yield* Effect.logInfo("receiver.invoice.requested", { amountSats });
        const response = yield* request("invoice-for-address", (signal) =>
          lightning.generateInvoiceForAddress(
            { lightningInvoiceForAddressRequest: { address, amountSat: amountSats } },
            { signal },
          ),
        );
        const details = yield* Effect.try({
          try: () => parseMainnetInvoice(response.invoice),
          catch: () =>
            new BarkError({ operation: "receiver", message: "The receiving wallet returned an invalid invoice." }),
        });
        yield* Effect.logInfo("receiver.invoice.created", {
          paymentHash: details.paymentHash,
          amountSats: details.amountSats,
          expiresAt: details.expiresAt,
        });
        return response.invoice;
      }),
    receipt: (paymentHash) =>
      request("receipt", (signal) => lightning.getReceiveStatus({ identifier: paymentHash }, { signal })).pipe(
        Effect.flatMap(Schema.decodeUnknownEffect(Receipt)),
        Effect.tap((receipt) =>
          Effect.logInfo("receiver.receipt", { paymentHash, state: receipt.state, amountSats: receipt.amountSat }),
        ),
        Effect.mapError(() => new BarkError({ operation: "receiver", message: "Could not read the payment status." })),
      ),
  };
}

export const ReceiverLive = Layer.effect(
  Receiver,
  Effect.gen(function* receiverConfig() {
    const basePath = yield* Config.String("BARK_RECEIVER_URL");
    const token = yield* Config.Redacted("BARK_RECEIVER_TOKEN");
    return makeReceiver(basePath, token);
  }),
);
