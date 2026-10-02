import { ParticipantAddressRequest } from "@/lib/participant-addresses";
import type { ParticipantAddressResult } from "@/lib/participant-addresses";
import { generateTestAddresses, TestParticipantWalletLive } from "@/server/bark/test-addresses";
import { createServerFn } from "@tanstack/react-start";
import { Effect, Schema } from "effect";

export const newParticipantAddresses = createServerFn({ method: "POST" })
  .validator(Schema.decodeUnknownSync(ParticipantAddressRequest))
  .handler(({ data }: Readonly<{ data: typeof ParticipantAddressRequest.Type }>): Promise<ParticipantAddressResult> =>
    Effect.runPromise(
      generateTestAddresses(data.count).pipe(
        Effect.provide(TestParticipantWalletLive),
        Effect.scoped,
        Effect.map((addresses: readonly string[]): ParticipantAddressResult => ({ ok: true, addresses })),
        Effect.catch(() =>
          Effect.succeed<ParticipantAddressResult>({
            ok: false,
            message:
              "Start the shared mainnet Bark daemon on port 3041, then retry, or enter payout addresses manually.",
          }),
        ),
      ),
    ),
  );
