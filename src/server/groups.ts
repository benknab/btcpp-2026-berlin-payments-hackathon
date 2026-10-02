import { DatabaseLive } from "@/db/database";
import { createGroup, getGroup, requireParticipant } from "@/db/groups";
import type { GroupView } from "@/db/groups";
import { CreateGroupRequest, GroupRequest, ParticipantRequest } from "@/domain/group-input";
import { createServerFn } from "@tanstack/react-start";
import { getRequestUrl } from "@tanstack/react-start/server";
import { Effect, Schema } from "effect";

import { readOrganizerToken, readParticipantId, saveOrganizerToken, saveParticipantId } from "./group-session";
import { runServer } from "./telemetry";

export interface GroupPageData extends GroupView {
  readonly selectedParticipantId: string | null;
  readonly origin: string;
}

export const newGroup = createServerFn({ method: "POST" })
  .validator(Schema.decodeUnknownSync(CreateGroupRequest))
  .handler(
    async ({ data }: { readonly data: typeof CreateGroupRequest.Type }): Promise<{ readonly inviteKey: string }> => {
      const created = await runServer("event.create", createGroup(data).pipe(Effect.provide(DatabaseLive)));
      saveOrganizerToken(created.groupId, created.organizerToken);
      saveParticipantId(created.groupId, created.organizerId);
      return { inviteKey: created.inviteKey };
    },
  );

export const groupPage = createServerFn({ method: "GET" })
  .validator(Schema.decodeUnknownSync(GroupRequest))
  .handler(async ({ data }: { readonly data: typeof GroupRequest.Type }): Promise<GroupPageData> => {
    const initial = await runServer("event.lookup", getGroup(data.inviteKey).pipe(Effect.provide(DatabaseLive)));
    const view = await runServer(
      "event.read",
      getGroup(data.inviteKey, readOrganizerToken(initial.group.id)).pipe(Effect.provide(DatabaseLive)),
    );
    const selected = readParticipantId(view.group.id);
    return {
      ...view,
      origin: getRequestUrl().origin,
      selectedParticipantId: view.participants.some((participant) => participant.id === selected)
        ? (selected ?? null)
        : null,
    };
  });

export const chooseParticipant = createServerFn({ method: "POST" })
  .validator(Schema.decodeUnknownSync(ParticipantRequest))
  .handler(async ({ data }: { readonly data: typeof ParticipantRequest.Type }): Promise<void> => {
    const view = await runServer(
      "event.participant.select",
      requireParticipant(data.inviteKey, data.participantId).pipe(Effect.provide(DatabaseLive)),
    );
    saveParticipantId(view.group.id, data.participantId);
  });
