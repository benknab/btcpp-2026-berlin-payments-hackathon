import { DEMO_PRESETS } from "@/domain/demo-presets";
import type { SavedDemoEvent } from "@/domain/demo-presets";
import { CopyIcon, ArrowUpRightIcon } from "lucide-react";
import { Fragment } from "react";
import type { ReactNode } from "react";

import { CommandGroup, CommandItem } from "./ui/command";

interface SavedCommandsProps {
  readonly events: readonly SavedDemoEvent[];
  readonly disabled: boolean;
  readonly visit: (event: SavedDemoEvent) => void;
  readonly copy: (event: SavedDemoEvent) => void;
}

export function DemoSavedCommands({ events, disabled, visit, copy }: SavedCommandsProps): ReactNode {
  return (
    <CommandGroup heading="Saved events">
      {events.map((event) => {
        const name = DEMO_PRESETS.find((preset) => preset.id === event.presetId)?.name ?? event.presetId;
        return (
          <Fragment key={event.inviteKey}>
            <CommandItem
              value={`Open ${name}`}
              disabled={disabled}
              onSelect={() => {
                visit(event);
              }}
              className="min-h-11"
            >
              <ArrowUpRightIcon />
              Open {name}
            </CommandItem>
            <CommandItem
              value={`Copy ${name} link`}
              disabled={disabled}
              onSelect={() => {
                copy(event);
              }}
              className="min-h-11"
            >
              <CopyIcon />
              Copy {name} link
            </CommandItem>
          </Fragment>
        );
      })}
    </CommandGroup>
  );
}
