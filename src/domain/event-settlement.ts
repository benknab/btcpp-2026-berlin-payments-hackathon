import { Schema } from "effect";

import { EntityId, InviteKey, ParticipantName } from "./group-input";
import { Sats } from "./money";
import { ReceivingAddress } from "./payout-destination";

export const SettlementMember = Schema.Struct({
  participantId: EntityId,
  name: ParticipantName,
  payInSats: Sats,
  receiveSats: Sats,
  lnurl: Schema.NullOr(ReceivingAddress),
});
export const SettlementMembers = Schema.Array(SettlementMember);
export type EventSettlementMember = typeof SettlementMember.Type;
export const ReceivingAddressRequest = Schema.Struct({
  inviteKey: InviteKey,
  participantId: EntityId,
  lnurl: ReceivingAddress,
});
