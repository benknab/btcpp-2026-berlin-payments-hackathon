import { SettlementCreate, SettlementPay, SettlementRequest } from "@/lib/settlement";
import type { SettlementResult } from "@/lib/settlement";
import { settlementRequest } from "@/server/pots/ui-service";
import { createServerFn } from "@tanstack/react-start";
import { Schema } from "effect";

export const openSettlement = createServerFn({ method: "POST" }).handler((): Promise<SettlementResult> =>
  settlementRequest({ kind: "open" }),
);

export const createSettlement = createServerFn({ method: "POST" })
  .validator(Schema.decodeUnknownSync(SettlementCreate))
  .handler(({ data }: Readonly<{ data: typeof SettlementCreate.Type }>): Promise<SettlementResult> =>
    settlementRequest({ kind: "create", setup: data.setup }),
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
