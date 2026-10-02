import { getOverview } from "@/db/balances";
import type { GroupOverview } from "@/db/balances";
import { loadEventInvoices } from "@/db/event-funding";
import type { EventInvoice, EventPayout } from "@/db/event-payment-schema";
import { loadEventPayouts } from "@/db/event-payouts";
import { loadEventSettlement } from "@/db/event-settlement";
import type { EventSettlementMember } from "@/domain/event-settlement";
import { GroupRequest } from "@/domain/group-input";
import { createServerFn } from "@tanstack/react-start";
import { Effect, Schema } from "effect";

import { DatabaseLive, runServer } from "./runtime";

export interface EventPageData {
  readonly overview: GroupOverview;
  readonly settlement: readonly EventSettlementMember[] | null;
  readonly invoices: readonly EventInvoice[];
  readonly payouts: readonly EventPayout[];
}

export const eventPage = createServerFn({ method: "GET" })
  .validator(Schema.decodeUnknownSync(GroupRequest))
  .handler(({ data }: { readonly data: typeof GroupRequest.Type }): Promise<EventPageData> =>
    runServer(
      "event.page",
      Effect.gen(function* page() {
        const overview = yield* getOverview(data.inviteKey);
        const settlement = yield* loadEventSettlement(data.inviteKey);
        const invoices = yield* loadEventInvoices(data.inviteKey);
        const payouts = yield* loadEventPayouts(data.inviteKey);
        return { overview, settlement, invoices, payouts };
      }).pipe(Effect.provide(DatabaseLive)),
    ),
  );
