import { PendingDemoEventSchema, SavedDemoEventSchema } from "@/domain/demo-presets";
import type { DemoPresetId, PendingDemoEvent, SavedDemoEvent } from "@/domain/demo-presets";
import { newDemoEvent, openSavedDemoEvent } from "@/server/demo-events";
import { Option, Schema } from "effect";

const SAVED_KEY = "bark:mainnet:demo-events";
const PENDING_PREFIX = "bark:mainnet:demo-pending:";
const decodeSaved = Schema.decodeUnknownOption(Schema.fromJsonString(Schema.Array(SavedDemoEventSchema)));
const decodePending = Schema.decodeUnknownSync(Schema.fromJsonString(PendingDemoEventSchema));
const SECRET_BYTES = 32;
const HEX_RADIX = 16;
const HEX_BYTE_LENGTH = 2;

export function readDemoEvents(): readonly SavedDemoEvent[] {
  const value = localStorage.getItem(SAVED_KEY);
  return value === null ? [] : Option.getOrElse(decodeSaved(value), () => []);
}

function pendingDemo(presetId: DemoPresetId): PendingDemoEvent {
  const key = `${PENDING_PREFIX}${presetId}`;
  const stored = localStorage.getItem(key);
  if (stored !== null) {
    return decodePending(stored);
  }
  const requestKey = Array.from(crypto.getRandomValues(new Uint8Array(SECRET_BYTES)), (byte) =>
    byte.toString(HEX_RADIX).padStart(HEX_BYTE_LENGTH, "0"),
  ).join("");
  const pending = { presetId, requestKey, walletId: crypto.randomUUID() };
  localStorage.setItem(key, JSON.stringify(pending));
  return pending;
}

export async function runDemoPreset(presetId: DemoPresetId): Promise<SavedDemoEvent> {
  const pending = pendingDemo(presetId);
  const { createEventWallet } = await import("./event-wallet");
  const arkAddress = await createEventWallet(pending.walletId);
  const created = await newDemoEvent({ data: { presetId, requestKey: pending.requestKey, arkAddress } });
  const saved = { ...pending, arkAddress, inviteKey: created.inviteKey };
  const previous = readDemoEvents().filter((event) => event.presetId !== presetId);
  localStorage.setItem(SAVED_KEY, JSON.stringify([saved, ...previous]));
  localStorage.removeItem(`${PENDING_PREFIX}${presetId}`);
  return saved;
}

export async function openDemoEvent(event: SavedDemoEvent): Promise<string> {
  // Reissue this browser's owner/participant cookies without changing the existing event.
  const opened = await openSavedDemoEvent({ data: event });
  return opened.inviteKey;
}

export function demoEventUrl(event: SavedDemoEvent): string {
  return new URL(`/groups/${event.inviteKey}`, globalThis.location.origin).href;
}
