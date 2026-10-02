import { getGroup } from "@/db/groups";
import { walletTopUpInvoice } from "@/db/wallet-top-up";
import { WalletTopUpRequest } from "@/domain/wallet-top-up";
import type { WalletTopUpInvoice } from "@/domain/wallet-top-up";
import { createServerFn } from "@tanstack/react-start";
import { Effect, Layer, Schema } from "effect";

import { ReceiverLive } from "./bark/receiver";
import { readOrganizerToken } from "./group-session";
import { DatabaseLive, runServer } from "./runtime";

const TopUpLive = Layer.merge(DatabaseLive, ReceiverLive);

export const createWalletTopUpInvoice = createServerFn({ method: "POST" })
  .validator(Schema.decodeUnknownSync(WalletTopUpRequest))
  .handler(({ data }: { readonly data: typeof WalletTopUpRequest.Type }): Promise<WalletTopUpInvoice> =>
    runServer(
      "wallet.top-up.invoice",
      Effect.gen(function* topUp() {
        const { group } = yield* getGroup(data.inviteKey);
        return yield* walletTopUpInvoice(data, readOrganizerToken(group.id));
      }).pipe(Effect.provide(TopUpLive)),
      { amountSats: data.amountSats },
    ),
  );
