import { DatabaseLive } from "@/db/database";
import { contributionInvoice, loadEventInvoices, reconcileEventInvoices } from "@/db/event-funding";
import type { EventInvoice } from "@/db/event-payment-schema";
import { GroupRequest, ParticipantRequest } from "@/domain/group-input";
import { createServerFn } from "@tanstack/react-start";
import { Effect, Layer, Schema } from "effect";

import { ReceiverLive } from "./bark/receiver";

const FundingLive = Layer.merge(DatabaseLive, ReceiverLive);

export const eventInvoicesPage = createServerFn({ method: "GET" })
  .validator(Schema.decodeUnknownSync(GroupRequest))
  .handler(({ data }: { readonly data: typeof GroupRequest.Type }): Promise<readonly EventInvoice[]> =>
    Effect.runPromise(loadEventInvoices(data.inviteKey).pipe(Effect.provide(DatabaseLive))),
  );

export const createContributionInvoice = createServerFn({ method: "POST" })
  .validator(Schema.decodeUnknownSync(ParticipantRequest))
  .handler(({ data }: { readonly data: typeof ParticipantRequest.Type }): Promise<EventInvoice> =>
    Effect.runPromise(contributionInvoice(data.inviteKey, data.participantId).pipe(Effect.provide(FundingLive))),
  );

export const refreshContributions = createServerFn({ method: "POST" })
  .validator(Schema.decodeUnknownSync(GroupRequest))
  .handler(({ data }: { readonly data: typeof GroupRequest.Type }): Promise<readonly EventInvoice[]> =>
    Effect.runPromise(reconcileEventInvoices(data.inviteKey).pipe(Effect.provide(FundingLive))),
  );
