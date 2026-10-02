import { DEMO_PRESETS, demoTotal } from "@/domain/demo-presets";
import { FlaskConicalIcon, PlusIcon } from "lucide-react";
import type { ReactNode } from "react";

import { DemoMenuFeedback } from "./demo-menu-feedback";
import { DemoSavedCommands } from "./demo-saved-commands";
import { Button } from "./ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "./ui/command";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { useDemoPresets } from "./use-demo-presets";

export function DemoPresetMenu(): ReactNode {
  const menu = useDemoPresets();
  return (
    <Dialog
      open={menu.open}
      onOpenChange={(open) => {
        menu.changeOpen(open);
      }}
    >
      <DialogTrigger
        render={
          <Button size="lg" className="fixed right-4 bottom-4 z-40 rounded-full shadow-lg sm:right-6 sm:bottom-6" />
        }
      >
        <FlaskConicalIcon data-icon="inline-start" />
        Demo
      </DialogTrigger>
      <DialogContent className="gap-0 p-0 sm:max-w-md" showCloseButton={false}>
        <DialogHeader className="sr-only">
          <DialogTitle>Demo presets</DialogTitle>
          <DialogDescription>Create a preset event or open a saved event.</DialogDescription>
        </DialogHeader>
        <Command>
          <CommandInput aria-label="Search demo commands" placeholder="Search demo commands…" disabled={menu.pending} />
          <CommandList>
            <CommandEmpty>No commands found.</CommandEmpty>
            <CommandGroup heading="Create event">
              {DEMO_PRESETS.map((preset) => (
                <CommandItem
                  key={preset.id}
                  value={`Create ${preset.name} ${demoTotal(preset)} sats`}
                  disabled={menu.pending}
                  onSelect={() => {
                    menu.create(preset.id);
                  }}
                  className="min-h-11"
                >
                  <PlusIcon />
                  <span className="flex flex-1 items-center justify-between gap-3">
                    <span>{preset.name}</span>
                    <span className="text-muted-foreground">{demoTotal(preset)} sats</span>
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
            {menu.saved.length > 0 && (
              <DemoSavedCommands events={menu.saved} disabled={menu.pending} visit={menu.visit} copy={menu.copy} />
            )}
          </CommandList>
        </Command>
        <DemoMenuFeedback pending={menu.pending} error={menu.error} link={menu.link} copied={menu.copied} />
      </DialogContent>
    </Dialog>
  );
}
