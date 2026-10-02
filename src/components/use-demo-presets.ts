import { demoEventUrl, openDemoEvent, readDemoEvents, runDemoPreset } from "@/browser/demo-events";
import type { DemoPresetId, SavedDemoEvent } from "@/domain/demo-presets";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { useAction } from "./use-action";

interface DemoMenuState {
  readonly open: boolean;
  readonly pending: boolean;
  readonly error: string | null;
  readonly saved: readonly SavedDemoEvent[];
  readonly link: string | null;
  readonly copied: boolean;
  readonly changeOpen: (open: boolean) => void;
  readonly create: (presetId: DemoPresetId) => void;
  readonly visit: (event: SavedDemoEvent) => void;
  readonly copy: (event: SavedDemoEvent) => void;
}

export function useDemoPresets(): DemoMenuState {
  const navigate = useNavigate();
  const action = useAction();
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState<readonly SavedDemoEvent[]>([]);
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);

  function changeOpen(next: boolean): void {
    setOpen(next);
    if (next) {
      setLink(null);
      setStorageError(null);
      try {
        setSaved(readDemoEvents());
      } catch {
        setStorageError("Allow browser storage to save demo events.");
      }
    }
  }

  function create(presetId: DemoPresetId): void {
    action.run(async (): Promise<void> => {
      const created = await runDemoPreset(presetId);
      setSaved(readDemoEvents());
      await navigate({ to: "/groups/$inviteKey", params: { inviteKey: created.inviteKey } });
      setOpen(false);
    }, "Could not create the demo event. Check your connection and browser storage, then retry.");
  }

  function visit(event: SavedDemoEvent): void {
    action.run(async (): Promise<void> => {
      const inviteKey = await openDemoEvent(event);
      await navigate({ to: "/groups/$inviteKey", params: { inviteKey } });
      setOpen(false);
    }, "Could not open the saved event.");
  }

  function copy(event: SavedDemoEvent): void {
    const url = demoEventUrl(event);
    setLink(url);
    setCopied(false);
    action.run(async (): Promise<void> => {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    }, "Could not copy. Select the event link below to copy it manually.");
  }

  return {
    open,
    pending: action.pending,
    error: storageError ?? action.error,
    saved,
    link,
    copied,
    changeOpen,
    create,
    visit,
    copy,
  };
}
