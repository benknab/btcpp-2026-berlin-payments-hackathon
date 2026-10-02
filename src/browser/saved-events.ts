import { parseSavedEventIds, rememberEventId } from "@/domain/saved-events";

export const SAVED_EVENTS_KEY = "splitbark:saved-events";

export function readSavedEventIds(): readonly string[] {
  try {
    return parseSavedEventIds(localStorage.getItem(SAVED_EVENTS_KEY));
  } catch {
    return [];
  }
}

export function saveEventId(inviteKey: string): void {
  try {
    const inviteKeys = rememberEventId(readSavedEventIds(), inviteKey);
    localStorage.setItem(SAVED_EVENTS_KEY, JSON.stringify(inviteKeys));
  } catch {
    // Unavailable browser storage must not block creating or joining an event.
  }
}
