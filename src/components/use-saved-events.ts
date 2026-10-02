import { readSavedEventIds, SAVED_EVENTS_KEY } from "@/browser/saved-events";
import type { SavedEventSummary } from "@/domain/saved-events";
import { savedEvents } from "@/server/saved-events";
import { useEffect, useState } from "react";

interface SavedEventsState {
  readonly events: readonly SavedEventSummary[];
  readonly loading: boolean;
  readonly error: string | null;
}

export function useSavedEvents(): SavedEventsState {
  const [state, setState] = useState<SavedEventsState>({ events: [], loading: false, error: null });
  useEffect(() => {
    let generation = 0;
    function refresh(): void {
      generation += 1;
      const request = generation;
      const inviteKeys = readSavedEventIds();
      setState({ events: [], loading: inviteKeys.length > 0, error: null });
      if (inviteKeys.length === 0) {
        return;
      }
      savedEvents({ data: { inviteKeys } })
        .then((events): void => {
          if (generation === request) {
            setState({ events, loading: false, error: null });
          }
        })
        .catch((): void => {
          if (generation === request) {
            setState({ events: [], loading: false, error: "Could not load saved events. Reload to try again." });
          }
        });
    }
    function onStorage(event: StorageEvent): void {
      if (event.key === SAVED_EVENTS_KEY || event.key === null) {
        refresh();
      }
    }
    refresh();
    globalThis.addEventListener("storage", onStorage);
    return (): void => {
      generation += 1;
      globalThis.removeEventListener("storage", onStorage);
    };
  }, []);
  return state;
}
