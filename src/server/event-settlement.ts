import { DatabaseLive } from "@/db/database";
import { saveReceivingAddress } from "@/db/event-receiving-address";
import { loadEventSettlement, lockEventSettlement } from "@/db/event-settlement";
import { getGroup } from "@/db/groups";
import { ReceivingAddressRequest } from "@/domain/event-settlement";
import type { EventSettlementMember } from "@/domain/event-settlement";
import { GroupRequest } from "@/domain/group-input";
import { createServerFn } from "@tanstack/react-start";
import { Effect, Schema } from "effect";

import { readOrganizerToken, readParticipantId } from "./group-session";
import { runServer } from "./telemetry";

const organizerToken = Effect.fn("eventOrganizerToken")(function* organizerToken(inviteKey: string) {
  const view = yield* getGroup(inviteKey);
  return readOrganizerToken(view.group.id);
});

export const eventSettlementPage = createServerFn({ method: "GET" })
  .validator(Schema.decodeUnknownSync(GroupRequest))
  .handler(({ data }: { readonly data: typeof GroupRequest.Type }): Promise<readonly EventSettlementMember[] | null> =>
    runServer("settlement.read", loadEventSettlement(data.inviteKey).pipe(Effect.provide(DatabaseLive))),
  );

export const lockEvent = createServerFn({ method: "POST" })
  .validator(Schema.decodeUnknownSync(GroupRequest))
  .handler(({ data }: { readonly data: typeof GroupRequest.Type }): Promise<readonly EventSettlementMember[] | null> =>
    runServer(
      "settlement.lock",
      Effect.gen(function* lock() {
        return yield* lockEventSettlement(data.inviteKey, yield* organizerToken(data.inviteKey));
      }).pipe(Effect.provide(DatabaseLive)),
    ),
  );

export const updateReceivingAddress = createServerFn({ method: "POST" })
  .validator(Schema.decodeUnknownSync(ReceivingAddressRequest))
  .handler(({ data }: { readonly data: typeof ReceivingAddressRequest.Type }): Promise<void> =>
    runServer(
      "settlement.address.save",
      Effect.gen(function* update() {
        const view = yield* getGroup(data.inviteKey);
        yield* saveReceivingAddress(data, readOrganizerToken(view.group.id), readParticipantId(view.group.id));
      }).pipe(Effect.provide(DatabaseLive)),
    ),
  );
