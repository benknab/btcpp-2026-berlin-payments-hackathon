import { Schema } from "effect";

import { EntityId, InviteKey, ParticipantName } from "./group-input";
import { Lnurl } from "./lnurl";
import { Sats } from "./money";

export const SettlementMember = Schema.Struct({
  participantId: EntityId,
  name: ParticipantName,
  payInSats: Sats,
  receiveSats: Sats,
  lnurl: Schema.NullOr(Lnurl),
});
export const SettlementMembers = Schema.Array(SettlementMember);
export type EventSettlementMember = typeof SettlementMember.Type;
export const ReceivingAddressRequest = Schema.Struct({
  inviteKey: InviteKey,
  participantId: EntityId,
  lnurl: Lnurl,
});
