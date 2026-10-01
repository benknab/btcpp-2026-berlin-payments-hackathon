import { Sats, SignetAddress } from "@/lib/pot";
import { Context, Schema } from "effect";
import type { Effect } from "effect";

import type { BarkError } from "./error";

export { BarkError } from "./error";

export const BarkDestination = Schema.Struct({
  amountSat: Sats,
  destination: Schema.Struct({ type: Schema.String, value: Schema.String }),
});
export const BarkMovementSchema = Schema.Struct({
  id: Sats,
  status: Schema.Literals(["pending", "successful", "failed", "canceled"]),
  receivedOn: Schema.Array(BarkDestination),
  sentTo: Schema.Array(BarkDestination),
});
export type BarkMovement = typeof BarkMovementSchema.Type;

export const BarkAddress = Schema.Struct({ address: SignetAddress });
export const BarkBalance = Schema.Struct({ spendableSat: Sats });
export const BarkWallet = Schema.Struct({ fingerprint: Schema.NonEmptyString });

export interface BarkOperations {
  readonly address: () => Effect.Effect<string, BarkError>;
  readonly balance: () => Effect.Effect<number, BarkError>;
  readonly history: () => Effect.Effect<readonly BarkMovement[], BarkError>;
  readonly sync: () => Effect.Effect<void, BarkError>;
  readonly ready: () => Effect.Effect<void, BarkError>;
  readonly fingerprint: () => Effect.Effect<string, BarkError>;
  readonly send: (address: string, amountSat: number) => Effect.Effect<void, BarkError>;
  readonly createSignetWallet: () => Effect.Effect<void, BarkError>;
}

export class Bark extends Context.Service<Bark, BarkOperations>()("payments/Bark") {}
