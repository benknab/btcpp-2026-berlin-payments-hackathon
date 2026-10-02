import { MainnetAddress } from "@/lib/pot";
import { Schema } from "effect";

import {
  DUPLICATE_PAYOUT_DESTINATION_ERROR,
  hasUniquePayoutDestinations,
  ReceivingAddress,
} from "./payout-destination";

export const MAX_GROUP_NAME = 100;
export const MAX_PARTICIPANT_NAME = 40;
export const MAX_PARTICIPANTS = 20;

export const ParticipantName = Schema.String.pipe(
  Schema.check(Schema.isTrimmed(), Schema.isMinLength(1), Schema.isMaxLength(MAX_PARTICIPANT_NAME)),
);

const GroupName = Schema.String.pipe(
  Schema.check(Schema.isTrimmed(), Schema.isMinLength(1), Schema.isMaxLength(MAX_GROUP_NAME)),
);
const OtherParticipants = Schema.Array(ParticipantName).pipe(
  Schema.check(Schema.isMinLength(1), Schema.isMaxLength(MAX_PARTICIPANTS - 1)),
);
export const EntityId = Schema.String.pipe(Schema.check(Schema.isUUID()));
const ParticipantLnurls = Schema.Array(Schema.NullOr(ReceivingAddress));

export const NewGroup = Schema.Struct({
  name: GroupName,
  organizerName: ParticipantName,
  organizerLnurl: ReceivingAddress,
  participantNames: OtherParticipants,
  participantLnurls: Schema.optional(ParticipantLnurls),
}).pipe(
  Schema.check(
    Schema.makeFilter((input) => {
      const names = [input.organizerName, ...input.participantNames].map((name) => name.toLocaleLowerCase("en-US"));
      return new Set(names).size === names.length || "Each participant needs a different name.";
    }),
    Schema.makeFilter(
      (input) =>
        input.participantLnurls === undefined ||
        input.participantLnurls.length === input.participantNames.length ||
        "Receiving addresses must match the participants.",
    ),
    Schema.makeFilter(
      (input) =>
        hasUniquePayoutDestinations([input.organizerLnurl, ...(input.participantLnurls ?? [])]) ||
        DUPLICATE_PAYOUT_DESTINATION_ERROR,
    ),
  ),
);

// Adding a field preserves all participant-name and receiving-address checks.
export const CreateGroupRequest = NewGroup.mapFields(() => ({ ...NewGroup.fields, arkAddress: MainnetAddress }), {
  unsafePreserveChecks: true,
});

export const InviteKey = Schema.String.pipe(Schema.check(Schema.isPattern(/^[a-f\d]{64}$/u)));
export const GroupRequest = Schema.Struct({ inviteKey: InviteKey });
export const ParticipantRequest = Schema.Struct({ inviteKey: InviteKey, participantId: EntityId });
