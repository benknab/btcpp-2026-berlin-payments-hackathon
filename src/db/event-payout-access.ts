import { isEventFunded } from "@/domain/event-funding";
import { Effect } from "effect";

import { loadEventInvoices } from "./event-funding";
import { loadEventSettlement, requireOrganizer } from "./event-settlement";
import { GroupError } from "./groups";

export const requirePayoutContext = Effect.fn("requireEventPayoutContext")(function* requirePayoutContext(
  inviteKey: string,
  token: string | undefined,
) {
  const view = yield* requireOrganizer(inviteKey, token);
  const members = yield* loadEventSettlement(inviteKey);
  const invoices = yield* loadEventInvoices(inviteKey);
  if (members === null || view.group.status === "open" || !isEventFunded(members, invoices)) {
    return yield* new GroupError({ message: "All contributions must be delivered before paying creditors." });
  }
  return { group: view.group, members, invoices };
});
