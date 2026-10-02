import { DatabaseLive } from "@/db/database";
import { completeEventSettlement } from "@/db/event-completion";
import type { EventPayout } from "@/db/event-payment-schema";
import { claimEventPayout, confirmEventPayout, prepareEventPayout } from "@/db/event-payouts";
import { getGroup } from "@/db/groups";
import { PrepareEventPayout, EventPayoutRequest, ConfirmEventPayout } from "@/domain/event-payout";
import { GroupRequest } from "@/domain/group-input";
import { createServerFn } from "@tanstack/react-start";
import { Effect, Schema } from "effect";

import { readOrganizerToken } from "./group-session";

const organizerToken = Effect.fn("payoutOrganizerToken")(function* organizerToken(inviteKey: string) {
  const view = yield* getGroup(inviteKey);
  return readOrganizerToken(view.group.id);
});

export const preparePayout = createServerFn({ method: "POST" })
  .validator(Schema.decodeUnknownSync(PrepareEventPayout))
  .handler(({ data }: { readonly data: typeof PrepareEventPayout.Type }): Promise<EventPayout> =>
    Effect.runPromise(
      Effect.gen(function* prepare() {
        return yield* prepareEventPayout(data, yield* organizerToken(data.inviteKey));
      }).pipe(Effect.provide(DatabaseLive)),
    ),
  );

export const claimPayout = createServerFn({ method: "POST" })
  .validator(Schema.decodeUnknownSync(EventPayoutRequest))
  .handler(
    ({
      data,
    }: {
      readonly data: typeof EventPayoutRequest.Type;
    }): Promise<{ readonly claimed: boolean; readonly payout: EventPayout }> =>
      Effect.runPromise(
        Effect.gen(function* claim() {
          return yield* claimEventPayout(data, yield* organizerToken(data.inviteKey));
        }).pipe(Effect.provide(DatabaseLive)),
      ),
  );

export const confirmPayout = createServerFn({ method: "POST" })
  .validator(Schema.decodeUnknownSync(ConfirmEventPayout))
  .handler(({ data }: { readonly data: typeof ConfirmEventPayout.Type }): Promise<void> =>
    Effect.runPromise(
      Effect.gen(function* confirm() {
        yield* confirmEventPayout(data, yield* organizerToken(data.inviteKey));
      }).pipe(Effect.provide(DatabaseLive)),
    ),
  );

export const completeEvent = createServerFn({ method: "POST" })
  .validator(Schema.decodeUnknownSync(GroupRequest))
  .handler(({ data }: { readonly data: typeof GroupRequest.Type }): Promise<boolean> =>
    Effect.runPromise(
      Effect.gen(function* complete() {
        return yield* completeEventSettlement(data.inviteKey, yield* organizerToken(data.inviteKey));
      }).pipe(Effect.provide(DatabaseLive)),
    ),
  );
