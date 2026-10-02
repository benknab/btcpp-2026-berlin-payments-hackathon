import { CreateDemoEvent, DEMO_PEOPLE, DEMO_PRESETS, demoTotal, MAX_DEMO_TOTAL_SATS } from "@/domain/demo-presets";
import type { DemoPreset } from "@/domain/demo-presets";
import { hashToken, newId } from "@/server/group-tokens";
import { eq } from "drizzle-orm";
import { Effect, Schema } from "effect";

import { Database } from "./database";
import { addExpense } from "./expenses";
import type { ExpenseFailure } from "./expenses";
import { groups } from "./group-schema";
import { createGroup, getGroup, GroupError } from "./groups";
import type { CreatedGroup, GroupView } from "./groups";

const seedExpenses = Effect.fn("seedDemoExpenses")(function* seedExpenses(
  preset: DemoPreset,
  view: GroupView,
  inviteKey: string,
) {
  const date = new Date().toISOString().slice(0, "YYYY-MM-DD".length);
  for (const expense of preset.expenses) {
    const payer = view.participants.find((participant) => participant.name === expense.payer);
    if (payer === undefined) {
      return yield* new GroupError({ message: "The demo expense payer is not available." });
    }
    yield* addExpense({
      inviteKey,
      expenseId: newId(),
      payerId: payer.id,
      description: expense.description,
      amountSats: expense.amountSats,
      date,
    });
  }
  return yield* Effect.void;
});

const reuseDemo = Effect.fn("reuseDemoEvent")(function* reuseDemo(
  input: typeof CreateDemoEvent.Type,
  preset: DemoPreset,
  tokens: Readonly<{ inviteKey: string; organizerToken: string }>,
) {
  const view = yield* getGroup(tokens.inviteKey, tokens.organizerToken);
  const organizer = view.participants.find((participant) => participant.position === 0);
  if (
    !view.isOrganizer ||
    organizer === undefined ||
    view.group.arkAddress !== input.arkAddress ||
    view.group.name !== preset.name
  ) {
    return yield* new GroupError({ message: "This demo request was already used for another event." });
  }
  return { ...tokens, organizerId: organizer.id, groupId: view.group.id };
});

export const createDemoEvent = Effect.fn("createDemoEvent")(function* createDemoEvent(
  input: typeof CreateDemoEvent.Type,
  reuseOnly?: boolean,
): Effect.fn.Return<CreatedGroup, ExpenseFailure, Database> {
  const valid = yield* Schema.decodeUnknownEffect(CreateDemoEvent)(input);
  const preset = DEMO_PRESETS.find((entry) => entry.id === valid.presetId);
  const [owner, ...guests] = DEMO_PEOPLE;
  if (preset === undefined || owner === undefined || demoTotal(preset) > MAX_DEMO_TOTAL_SATS) {
    return yield* new GroupError({ message: "This demo preset is not available." });
  }
  // A browser-generated secret makes retries safe without storing plaintext tokens in the database.
  const inviteKey = hashToken(`demo-invite:${valid.requestKey}`);
  const organizerToken = hashToken(`demo-owner:${valid.requestKey}`);
  const database = yield* Database;
  return yield* database.transaction(() =>
    Effect.gen(function* seedDemoEvent() {
      const [existing] = yield* database
        .select()
        .from(groups)
        .where(eq(groups.inviteTokenHash, hashToken(inviteKey)));
      if (existing !== undefined) {
        return yield* reuseDemo(valid, preset, { inviteKey, organizerToken });
      }
      if (reuseOnly === true) {
        return yield* new GroupError({ message: "This saved demo event is no longer available." });
      }
      const created = yield* createGroup(
        {
          name: preset.name,
          organizerName: owner.name,
          organizerLnurl: owner.address,
          participantNames: guests.map((person) => person.name),
          participantLnurls: guests.map((person) => person.address),
          arkAddress: valid.arkAddress,
        },
        { inviteKey, organizerToken },
      );
      yield* seedExpenses(preset, yield* getGroup(inviteKey), inviteKey);
      return created;
    }),
  );
});
