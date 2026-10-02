import { getGroup } from "@/db/groups";
import { authorizeWalletWithdrawal } from "@/db/wallet-withdrawal";
import { GroupRequest } from "@/domain/group-input";
import { createServerFn } from "@tanstack/react-start";
import { Effect, Schema } from "effect";

import { readOrganizerToken } from "./group-session";
import { DatabaseLive, runServer } from "./runtime";

export const authorizeWithdrawal = createServerFn({ method: "POST" })
  .validator(Schema.decodeUnknownSync(GroupRequest))
  .handler(({ data }: { readonly data: typeof GroupRequest.Type }): Promise<{ readonly arkAddress: string }> =>
    runServer(
      "wallet.withdrawal.authorize",
      Effect.gen(function* authorize() {
        const { group } = yield* getGroup(data.inviteKey);
        return yield* authorizeWalletWithdrawal(data.inviteKey, readOrganizerToken(group.id));
      }).pipe(Effect.provide(DatabaseLive)),
    ),
  );
