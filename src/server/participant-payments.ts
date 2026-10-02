import { DatabaseLive } from "@/db/database";
import { readGroupPot } from "@/db/group-payment-access";
import { getGroup } from "@/db/groups";
import { issuePersonalLink, personalPayment, savePersonalAddress } from "@/db/participant-payments";
import { IssuePersonalLink, PersonalPaymentRequest, SavePersonalAddress } from "@/domain/group-settlement";
import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { Effect, Schema } from "effect";

import type { GroupActionResult } from "./group-action-result";
import { readOrganizerToken } from "./group-session";

export const personalAddressPage = createServerFn({ method: "GET" })
  .validator(Schema.decodeUnknownSync(PersonalPaymentRequest))
  .handler(({ data }: { readonly data: typeof PersonalPaymentRequest.Type }) => {
    setResponseHeader("Cache-Control", "no-store");
    setResponseHeader("Referrer-Policy", "no-referrer");
    return Effect.runPromise(
      Effect.gen(function* personalPage() {
        const profile = yield* personalPayment(data.accessKey);
        const pot = profile.status === "open" ? null : yield* readGroupPot(profile.groupId);
        return {
          ...profile,
          payment: pot?.participants.find((person) => person.userId === profile.participantId) ?? null,
        };
      }).pipe(Effect.provide(DatabaseLive)),
    );
  });

export const participantLink = createServerFn({ method: "POST" })
  .validator(Schema.decodeUnknownSync(IssuePersonalLink))
  .handler(({ data }: { readonly data: typeof IssuePersonalLink.Type }) =>
    Effect.runPromise(
      Effect.gen(function* generate() {
        const view = yield* getGroup(data.inviteKey);
        return yield* issuePersonalLink(data.inviteKey, data.participantId, readOrganizerToken(view.group.id));
      }).pipe(Effect.provide(DatabaseLive)),
    ),
  );

export const setPersonalAddress = createServerFn({ method: "POST" })
  .validator(Schema.decodeUnknownSync(SavePersonalAddress))
  .handler(({ data }: { readonly data: typeof SavePersonalAddress.Type }): Promise<GroupActionResult> =>
    Effect.runPromise(
      savePersonalAddress(data).pipe(
        Effect.as({ ok: true } satisfies GroupActionResult),
        Effect.catch((error: unknown) =>
          Effect.succeed({
            ok: false,
            message:
              typeof error === "object" &&
              error !== null &&
              "_tag" in error &&
              error._tag === "GroupError" &&
              "message" in error &&
              typeof error.message === "string"
                ? error.message
                : "Could not save this address. Refresh and try again.",
          } satisfies GroupActionResult),
        ),
        Effect.provide(DatabaseLive),
      ),
    ),
  );
