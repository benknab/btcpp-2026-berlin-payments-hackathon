import { Schema } from "effect";

import { InviteKey } from "./group-input";

export const SavedEventsRequest = Schema.Struct({ inviteKeys: Schema.Array(InviteKey) });

export interface SavedEventSummary {
  readonly inviteKey: string;
  readonly name: string;
}

export function parseSavedEventIds(stored: string | null): readonly string[] {
  if (stored === null) {
    return [];
  }
  try {
    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed)) {
      return [];
    }
    const values: readonly unknown[] = parsed;
    return [...new Set(values.filter((value): value is string => Schema.is(InviteKey)(value)))];
  } catch {
    return [];
  }
}

export function rememberEventId(inviteKeys: readonly string[], inviteKey: string): readonly string[] {
  return Schema.is(InviteKey)(inviteKey)
    ? [inviteKey, ...inviteKeys.filter((saved) => saved !== inviteKey)]
    : inviteKeys;
}
