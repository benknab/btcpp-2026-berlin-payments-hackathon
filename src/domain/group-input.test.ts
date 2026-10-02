import { describe, expect, it } from "@effect/vitest";
import { bech32 } from "@scure/base";
import { Effect, Schema } from "effect";

import { CreateGroupRequest, GroupRequest, MAX_PARTICIPANTS, NewGroup } from "./group-input";

const BOB_LNURL = bech32.encodeFromBytes(
  "lnurl",
  new TextEncoder().encode("https://wallet.com/.well-known/lnurlp/bob"),
);

describe("group validation", () => {
  it.effect.each([undefined, null, "", "tark1ace", "not-an-address"])(
    "requires a mainnet pot address for event creation: %j",
    (arkAddress: unknown) =>
      Effect.gen(function* verifyWalletAddress() {
        expect.hasAssertions();
        const input = { name: "Dinner", organizerName: "Alice", participantNames: ["Bob"], arkAddress };
        expect((yield* Effect.flip(Schema.decodeUnknownEffect(CreateGroupRequest)(input)))._tag).toBe("SchemaError");
      }),
  );

  it.effect("preserves participant validation when adding the pot address", () =>
    Effect.gen(function* verifyRequest() {
      expect.hasAssertions();
      const input = { name: "Dinner", organizerName: "Alice", participantNames: ["Bob"], arkAddress: "ark1ace" };
      expect(yield* Schema.decodeUnknownEffect(CreateGroupRequest)(input)).toStrictEqual(input);
      expect(
        (yield* Effect.flip(Schema.decodeUnknownEffect(CreateGroupRequest)({ ...input, participantNames: ["alice"] })))
          ._tag,
      ).toBe("SchemaError");
    }),
  );
  it.effect("accepts a group without an email or account", () =>
    Effect.gen(function* verifyGroup() {
      expect.hasAssertions();
      const input = { name: "Berlin weekend", organizerName: "Alice", participantNames: ["Bob", "Carol"] };
      expect(yield* Schema.decodeUnknownEffect(NewGroup)(input)).toStrictEqual(input);
    }),
  );

  it.effect.each([
    { name: "", organizerName: "Alice", participantNames: ["Bob"] },
    { name: "Berlin", organizerName: " Alice ", participantNames: ["Bob"] },
    { name: "Berlin", organizerName: "Alice", participantNames: [] },
    { name: "Berlin", organizerName: "Alice", participantNames: ["alice"] },
    { name: "Berlin", organizerName: "Alice", participantNames: ["Bob", "bob"] },
    { name: "Berlin", organizerName: "Alice", participantNames: Array.from({ length: MAX_PARTICIPANTS }, String) },
  ])("rejects invalid group %j", (input: unknown) =>
    Effect.gen(function* verifyInvalidGroup() {
      expect.hasAssertions();
      expect((yield* Effect.flip(Schema.decodeUnknownEffect(NewGroup)(input)))._tag).toBe("SchemaError");
    }),
  );

  it.effect.each([
    { participantLnurls: ["bob@wallet.com", "bob@wallet.com"] },
    { participantLnurls: ["bob@wallet.com", "lightning:bob@wallet.com"] },
    { participantLnurls: [BOB_LNURL, BOB_LNURL.toUpperCase()] },
    { participantLnurls: [BOB_LNURL, `lightning:${BOB_LNURL}`] },
    { participantLnurls: ["bob@wallet.com", BOB_LNURL] },
  ])(
    "rejects duplicate receiving destinations %#",
    ({ participantLnurls }: { readonly participantLnurls: readonly string[] }) =>
      Effect.gen(function* verifyDuplicates() {
        expect.hasAssertions();
        const input = { name: "Dinner", organizerName: "Alice", participantNames: ["Bob", "Carol"], participantLnurls };
        expect((yield* Effect.flip(Schema.decodeUnknownEffect(NewGroup)(input)))._tag).toBe("SchemaError");
      }),
  );

  it.effect.each([{ participantLnurls: [null, null] }, { participantLnurls: ["bob@wallet.com", "carol@wallet.com"] }])(
    "allows blank or distinct receiving destinations %#",
    ({ participantLnurls }: { readonly participantLnurls: readonly (string | null)[] }) =>
      Effect.gen(function* verifyDistinctDestinations() {
        expect.hasAssertions();
        const input = { name: "Dinner", organizerName: "Alice", participantNames: ["Bob", "Carol"], participantLnurls };
        expect(yield* Schema.decodeUnknownEffect(NewGroup)(input)).toStrictEqual(input);
      }),
  );

  it.effect("rejects malformed invite keys", () =>
    Effect.gen(function* verifyInviteKey() {
      expect.hasAssertions();
      expect((yield* Effect.flip(Schema.decodeUnknownEffect(GroupRequest)({ inviteKey: "guess" })))._tag).toBe(
        "SchemaError",
      );
    }),
  );

  it.effect("accepts optional receiving details while preserving their participant positions", () =>
    Effect.gen(function* verifyReceivingDetails() {
      expect.hasAssertions();
      const input = {
        name: "Dinner",
        organizerName: "Alice",
        participantNames: ["Bob", "Carol"],
        participantLnurls: [null, "carol@wallet.com"],
      };
      expect(yield* Schema.decodeUnknownEffect(NewGroup)(input)).toStrictEqual(input);
    }),
  );

  it.effect.each([
    { participantLnurls: ["invalid"] },
    { participantLnurls: [""] },
    { participantLnurls: [] },
    { participantLnurls: [null, "carol@wallet.com"] },
  ])(
    "rejects invalid or misaligned receiving details %j",
    (receivingDetails: { readonly participantLnurls: readonly (string | null)[] }) =>
      Effect.gen(function* verifyInvalidReceivingDetails() {
        expect.hasAssertions();
        const input = { name: "Dinner", organizerName: "Alice", participantNames: ["Bob"], ...receivingDetails };
        expect((yield* Effect.flip(Schema.decodeUnknownEffect(NewGroup)(input)))._tag).toBe("SchemaError");
      }),
  );
});
