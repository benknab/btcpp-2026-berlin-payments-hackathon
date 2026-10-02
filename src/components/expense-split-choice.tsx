import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { ExpenseSplitState } from "@/components/use-expense-split";
import { SlidersHorizontalIcon, UsersIcon } from "lucide-react";
import type { ReactNode } from "react";

export function ExpenseSplitChoice({
  split,
  disabled,
}: {
  readonly split: ExpenseSplitState;
  readonly disabled: boolean;
}): ReactNode {
  return (
    <ToggleGroup
      value={[split.draft.custom ? "custom" : "everyone"]}
      disabled={disabled}
      variant="outline"
      size="lg"
      className="w-full flex-col items-stretch sm:flex-row"
      aria-label="Split method"
      onValueChange={(value) => {
        if (value.length > 0) {
          split.customize(value[0] === "custom");
        }
      }}
    >
      <ToggleGroupItem value="everyone" className="w-full sm:w-auto sm:flex-1">
        <UsersIcon data-icon="inline-start" aria-hidden="true" />
        Everyone equally
      </ToggleGroupItem>
      <ToggleGroupItem value="custom" className="w-full sm:w-auto sm:flex-1">
        <SlidersHorizontalIcon data-icon="inline-start" aria-hidden="true" />
        Custom split
      </ToggleGroupItem>
    </ToggleGroup>
  );
}
