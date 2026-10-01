import { Schema } from "effect";

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a class factory, not an Error constructor.
export class BarkError extends Schema.TaggedError<BarkError>()("BarkError", {
  operation: Schema.String,
  message: Schema.String,
}) {}
