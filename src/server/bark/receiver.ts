import { parseMainnetInvoice } from "@/domain/bolt11";
import { Sats } from "@/domain/money";
import { Configuration, LightningApi, WalletApi } from "@secondts/barkd";
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

function request<Value>(run: () => Promise<Value>): Effect.Effect<Value, BarkError> {
  return Effect.tryPromise({
    try: run,
    catch: () => new BarkError({ operation: "receiver", message: "The mainnet receiving wallet is unavailable." }),
  });
}

export function makeReceiver(basePath: string, token: Readonly<Redacted.Redacted>): ReceiverOperations {
  const configuration = new Configuration({ basePath, accessToken: Redacted.value(token) });
  const lightning = new LightningApi(configuration);
  const wallet = new WalletApi(configuration);
  return {
    invoice: (address, amountSats) =>
      Effect.gen(function* createInvoice() {
        const info = yield* request(() => wallet.arkInfo({ signal: AbortSignal.timeout(TIMEOUT_MS) }));
        if (info.network !== "bitcoin") {
          return yield* new BarkError({ operation: "receiver", message: "The receiving wallet must use mainnet." });
        }
        const response = yield* request(() =>
          lightning.generateInvoiceForAddress(
            { lightningInvoiceForAddressRequest: { address, amountSat: amountSats } },
            { signal: AbortSignal.timeout(TIMEOUT_MS) },
          ),
        );
        yield* Effect.try({
          try: () => parseMainnetInvoice(response.invoice),
          catch: () =>
            new BarkError({ operation: "receiver", message: "The receiving wallet returned an invalid invoice." }),
        });
        return response.invoice;
      }),
    receipt: (paymentHash) =>
      request(() =>
        lightning.getReceiveStatus({ identifier: paymentHash }, { signal: AbortSignal.timeout(TIMEOUT_MS) }),
      ).pipe(
        Effect.flatMap(Schema.decodeUnknownEffect(Receipt)),
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
