import { DatabaseLive } from "@/db/database";
import { groupSettlementPage } from "@/db/group-settlements";
import type { GroupSettlementPage } from "@/db/group-settlements";
import { getGroup } from "@/db/groups";
import { GroupRequest } from "@/domain/group-input";
import { CloseGroupRequest, PayGroupRequest } from "@/domain/group-settlement";
import { createServerFn } from "@tanstack/react-start";
import { Effect, Schema } from "effect";

import { safeGroupResult } from "./group-action-result";
import type { GroupActionResult } from "./group-action-result";
import { readOrganizerToken } from "./group-session";
import { GroupPaymentLive, groupPaymentRequest } from "./pots/group-request";
import type { GroupPaymentAction } from "./pots/group-request";

export const settlementPage = createServerFn({ method: "GET" })
  .validator(Schema.decodeUnknownSync(GroupRequest))
  .handler(({ data }: { readonly data: typeof GroupRequest.Type }): Promise<GroupSettlementPage> =>
    Effect.runPromise(groupSettlementPage(data.inviteKey).pipe(Effect.provide(DatabaseLive))),
  );

function paymentAction(action: Omit<GroupPaymentAction, "organizerToken">): Promise<GroupActionResult> {
  return Effect.runPromise(
    safeGroupResult(() =>
      Effect.gen(function* authorizedAction() {
        const view = yield* getGroup(action.inviteKey);
        return yield* groupPaymentRequest({ ...action, organizerToken: readOrganizerToken(view.group.id) });
      }),
    ).pipe(Effect.provide(GroupPaymentLive)),
  );
}

export const closeGroup = createServerFn({ method: "POST" })
  .validator(Schema.decodeUnknownSync(CloseGroupRequest))
  .handler(({ data }: { readonly data: typeof CloseGroupRequest.Type }): Promise<GroupActionResult> =>
    paymentAction({ kind: "close", ...data }),
  );

export const checkGroupDeposits = createServerFn({ method: "POST" })
  .validator(Schema.decodeUnknownSync(GroupRequest))
  .handler(({ data }: { readonly data: typeof GroupRequest.Type }): Promise<GroupActionResult> =>
    paymentAction({ kind: "refresh", ...data }),
  );

export const payGroup = createServerFn({ method: "POST" })
  .validator(Schema.decodeUnknownSync(PayGroupRequest))
  .handler(({ data }: { readonly data: typeof PayGroupRequest.Type }): Promise<GroupActionResult> =>
    paymentAction({ kind: "pay", ...data }),
  );
