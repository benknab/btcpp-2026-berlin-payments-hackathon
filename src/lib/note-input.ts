import { Schema } from "effect";

export const MAX_NOTE_LENGTH = 280;
const body = Schema.String.pipe(
  Schema.check(Schema.isTrimmed(), Schema.isMinLength(1), Schema.isMaxLength(MAX_NOTE_LENGTH)),
);

export const NewNote = Schema.Struct({ body });
