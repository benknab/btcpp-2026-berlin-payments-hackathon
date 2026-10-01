import { getOverview } from "@/db/balances";
import type { GroupOverview } from "@/db/balances";
import { DatabaseLive } from "@/db/database";
import { GroupRequest } from "@/domain/group-input";
import { createServerFn } from "@tanstack/react-start";
import { Effect, Schema } from "effect";

export const groupOverview = createServerFn({ method: "GET" })
  .validator(Schema.decodeUnknownSync(GroupRequest))
  .handler(({ data }: { readonly data: typeof GroupRequest.Type }): Promise<GroupOverview> =>
    Effect.runPromise(getOverview(data.inviteKey).pipe(Effect.provide(DatabaseLive))),
  );
