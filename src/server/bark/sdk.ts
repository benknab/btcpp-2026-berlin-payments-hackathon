import { Sats, MainnetAddress } from "@/lib/pot";
import { Configuration, HistoryApi, ResponseError, WalletApi } from "@secondts/barkd";
import { Effect, Layer, Redacted, Schema } from "effect";

import { Bark, BarkAddress, BarkBalance, BarkError, BarkMovementSchema, BarkWallet } from "./service";
import type { BarkMovement, BarkOperations } from "./service";

const REQUEST_TIMEOUT_MS = 30_000;
const PositiveSats = Sats.pipe(Schema.check(Schema.isGreaterThan(0)));
export interface BarkConfig {
  readonly basePath: string;
  readonly token: Readonly<Redacted.Redacted>;
}

function request<Value>(
  operation: string,
  run: (signal: Readonly<AbortSignal>) => Promise<Value>,
): Effect.Effect<Value, BarkError> {
  return Effect.tryPromise({
    try: (signal: Readonly<AbortSignal>): Promise<Value> =>
      run(AbortSignal.any([signal, AbortSignal.timeout(REQUEST_TIMEOUT_MS)])),
    catch: (error): BarkError =>
      new BarkError({
        operation,
        message: error instanceof ResponseError ? `Bark HTTP ${error.response.status}` : "Bark request failed",
      }),
  });
}

function decode<Shape extends Schema.Top>(
  operation: string,
  schema: Shape,
  value: unknown,
): Effect.Effect<Shape["Type"], BarkError, Shape["DecodingServices"]> {
  return Schema.decodeUnknownEffect(schema)(value).pipe(
    Effect.mapError((): BarkError => new BarkError({ operation, message: "Invalid Bark response or input" })),
  );
}

function ensureMainnet(wallet: Readonly<WalletApi>): Effect.Effect<void, BarkError> {
  return request("arkInfo", (signal: Readonly<AbortSignal>): ReturnType<WalletApi["arkInfo"]> =>
    wallet.arkInfo({ signal }),
  ).pipe(
    Effect.flatMap((value: unknown) => decode("arkInfo", Schema.Struct({ network: Schema.Literal("bitcoin") }), value)),
    Effect.asVoid,
  );
}

function createMainnetWallet(wallet: Readonly<WalletApi>): Effect.Effect<void, BarkError> {
  return request("createWallet", (signal: Readonly<AbortSignal>): ReturnType<WalletApi["createWallet"]> =>
    wallet.createWallet(
      {
        createWalletRequest: {
          network: "mainnet",
          arkServer: "https://ark.second.tech",
          chainSource: { esplora: { url: "https://mempool.second.tech/api" } },
        },
      },
      { signal },
    ),
  ).pipe(Effect.asVoid);
}

function walletDetails(wallet: Readonly<WalletApi>): Effect.Effect<unknown, BarkError> {
  return request("wallet", (signal: Readonly<AbortSignal>): ReturnType<WalletApi["walletExists"]> =>
    wallet.walletExists({ signal }),
  );
}

export function makeBark(config: BarkConfig): BarkOperations {
  const configuration = new Configuration({ basePath: config.basePath, accessToken: Redacted.value(config.token) });
  const wallet = new WalletApi(configuration);
  const historyApi = new HistoryApi(configuration);
  return {
    address: (): Effect.Effect<string, BarkError> =>
      request("address", (signal: Readonly<AbortSignal>): ReturnType<WalletApi["address"]> =>
        wallet.address({ signal }),
      ).pipe(
        Effect.flatMap((value: unknown) => decode("address", BarkAddress, value)),
        Effect.map((value): string => value.address),
      ),
    balance: (): Effect.Effect<number, BarkError> =>
      request("balance", (signal: Readonly<AbortSignal>): ReturnType<WalletApi["balance"]> =>
        wallet.balance({ signal }),
      ).pipe(
        Effect.flatMap((value: unknown) => decode("balance", BarkBalance, value)),
        Effect.map((value): number => value.spendableSat),
      ),
    history: (): Effect.Effect<readonly BarkMovement[], BarkError> =>
      request("history", (signal: Readonly<AbortSignal>): ReturnType<HistoryApi["list"]> =>
        historyApi.list({}, { signal }),
      ).pipe(Effect.flatMap((value: unknown) => decode("history", Schema.Array(BarkMovementSchema), value))),
    sync: (): Effect.Effect<void, BarkError> =>
      request("sync", (signal: Readonly<AbortSignal>): Promise<void> => wallet.sync({ signal })),
    ready: (): Effect.Effect<void, BarkError> => walletDetails(wallet).pipe(Effect.asVoid),
    fingerprint: (): Effect.Effect<string, BarkError> =>
      ensureMainnet(wallet).pipe(
        Effect.andThen(walletDetails(wallet)),
        Effect.flatMap((value: unknown) => decode("wallet", BarkWallet, value)),
        Effect.map((value): string => value.fingerprint),
      ),
    send: (address, amountSat): Effect.Effect<void, BarkError> =>
      Effect.gen(function* send() {
        yield* ensureMainnet(wallet);
        yield* decode("send", MainnetAddress, address);
        yield* decode("send", PositiveSats, amountSat);
        yield* request("send", (signal: Readonly<AbortSignal>): ReturnType<WalletApi["send"]> =>
          wallet.send({ sendRequest: { destination: address, amountSat } }, { signal }),
        );
      }),
    createMainnetWallet: (): Effect.Effect<void, BarkError> => createMainnetWallet(wallet),
  };
}

export function barkLayer(config: BarkConfig): Layer.Layer<Bark> {
  return Layer.succeed(Bark, makeBark(config));
}
