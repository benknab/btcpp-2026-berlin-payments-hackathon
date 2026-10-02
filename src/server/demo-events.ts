import { DatabaseLive } from "@/db/database";
import { createDemoEvent } from "@/db/demo-events";
import { CreateDemoEvent } from "@/domain/demo-presets";
import { createServerFn } from "@tanstack/react-start";
import { Effect, Schema } from "effect";

import { saveOrganizerToken, saveParticipantId } from "./group-session";
import { runServer } from "./telemetry";

async function runDemoEvent(
  data: typeof CreateDemoEvent.Type,
  reuseOnly: boolean,
): Promise<{ readonly inviteKey: string }> {
  const created = await runServer(
    "event.demo.setup",
    createDemoEvent(data, reuseOnly).pipe(Effect.provide(DatabaseLive)),
  );
  saveOrganizerToken(created.groupId, created.organizerToken);
  saveParticipantId(created.groupId, created.organizerId);
  return { inviteKey: created.inviteKey };
}

export const newDemoEvent = createServerFn({ method: "POST" })
  .validator(Schema.decodeUnknownSync(CreateDemoEvent))
  .handler(({ data }: { readonly data: typeof CreateDemoEvent.Type }) => runDemoEvent(data, false));

export const openSavedDemoEvent = createServerFn({ method: "POST" })
  .validator(Schema.decodeUnknownSync(CreateDemoEvent))
  .handler(({ data }: { readonly data: typeof CreateDemoEvent.Type }) => runDemoEvent(data, true));
