import { DatabaseLive } from "@/db/database";
import { getSavedEvents } from "@/db/saved-events";
import { SavedEventsRequest } from "@/domain/saved-events";
import type { SavedEventSummary } from "@/domain/saved-events";
import { createServerFn } from "@tanstack/react-start";
import { Effect, Schema } from "effect";

import { runServer } from "./telemetry";

export const savedEvents = createServerFn({ method: "GET" })
  .validator(Schema.decodeUnknownSync(SavedEventsRequest))
  .handler(({ data }: { readonly data: typeof SavedEventsRequest.Type }): Promise<readonly SavedEventSummary[]> =>
    runServer("event.saved", getSavedEvents(data.inviteKeys).pipe(Effect.provide(DatabaseLive))),
  );
