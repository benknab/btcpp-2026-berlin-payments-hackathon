import { DatabaseLive } from "@/db/database";
import { listSettlements, loadSettlement, startSettlement } from "@/db/settlements";
import type { SettlementDocument, SettlementResult, SettlementSummary } from "@/lib/settlement";
import { SettlementCreate, SettlementPay, SettlementRequest } from "@/lib/settlement";
import { settlementRequest } from "@/server/pots/ui-service";
import { createServerFn } from "@tanstack/react-start";
import { Effect, Schema } from "effect";

export const getSettlements = createServerFn({ method: "GET" }).handler((): Promise<readonly SettlementSummary[]> =>
  Effect.runPromise(listSettlements().pipe(Effect.provide(DatabaseLive))),
);

export const newSettlement = createServerFn({ method: "POST" }).handler((): Promise<number> =>
  Effect.runPromise(startSettlement().pipe(Effect.provide(DatabaseLive))),
);

export const getSettlement = createServerFn({ method: "GET" })
  .validator(Schema.decodeUnknownSync(SettlementRequest))
  .handler(({ data }: Readonly<{ data: typeof SettlementRequest.Type }>): Promise<SettlementDocument | null> =>
    Effect.runPromise(
      loadSettlement(data.id).pipe(
        Effect.provide(DatabaseLive),
        Effect.catchTag("PotError", () => Effect.succeed(null)),
      ),
    ),
  );

export const saveSettlementDetails = createServerFn({ method: "POST" })
  .validator(Schema.decodeUnknownSync(SettlementCreate))
  .handler(({ data }: Readonly<{ data: typeof SettlementCreate.Type }>): Promise<SettlementResult> =>
    settlementRequest({ kind: "save", id: data.id, setup: data.setup }),
  );

export const prepareSettlement = createServerFn({ method: "POST" })
  .validator(Schema.decodeUnknownSync(SettlementRequest))
  .handler(({ data }: Readonly<{ data: typeof SettlementRequest.Type }>): Promise<SettlementResult> =>
    settlementRequest({ kind: "prepare", id: data.id }),
  );

export const refreshSettlement = createServerFn({ method: "POST" })
  .validator(Schema.decodeUnknownSync(SettlementRequest))
  .handler(({ data }: Readonly<{ data: typeof SettlementRequest.Type }>): Promise<SettlementResult> =>
    settlementRequest({ kind: "refresh", id: data.id }),
  );

export const paySettlement = createServerFn({ method: "POST" })
  .validator(Schema.decodeUnknownSync(SettlementPay))
  .handler(({ data }: Readonly<{ data: typeof SettlementPay.Type }>): Promise<SettlementResult> =>
    settlementRequest({ kind: "pay", id: data.id }),
  );
