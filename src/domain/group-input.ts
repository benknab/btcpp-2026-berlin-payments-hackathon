import { Schema } from "effect";

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

export const NewGroup = Schema.Struct({
  name: GroupName,
  organizerName: ParticipantName,
  participantNames: OtherParticipants,
}).pipe(
  Schema.check(
    Schema.makeFilter((input) => {
      const names = [input.organizerName, ...input.participantNames].map((name) => name.toLocaleLowerCase("en-US"));
      return new Set(names).size === names.length || "Each participant needs a different name.";
    }),
  ),
);

export const InviteKey = Schema.String.pipe(Schema.check(Schema.isPattern(/^[a-f\d]{64}$/u)));
export const GroupRequest = Schema.Struct({ inviteKey: InviteKey });
export const ParticipantRequest = Schema.Struct({ inviteKey: InviteKey, participantId: EntityId });
