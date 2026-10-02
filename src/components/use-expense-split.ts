import type { ExpenseView } from "@/db/expenses";
import type { ParticipantData } from "@/db/groups";
import type { ExpenseShare } from "@/domain/accounting";
import { calculateExpenseSplit } from "@/domain/expense-split";
import type { ExpenseSplit, SplitMode } from "@/domain/expense-split";
import { Effect } from "effect";
import { useState } from "react";

interface SplitDraft {
  readonly custom: boolean;
  readonly mode: SplitMode;
  readonly selected: readonly string[];
  readonly values: Readonly<Record<string, string>>;
}

export interface ExpenseSplitState {
  readonly draft: SplitDraft;
  readonly config: ExpenseSplit;
  readonly preview: readonly ExpenseShare[];
  readonly error: string | null;
  readonly changeMode: (mode: SplitMode) => void;
  readonly select: (id: string, checked: boolean) => void;
  readonly selectAll: (checked: boolean) => void;
  readonly customize: (custom: boolean) => void;
  readonly changeValue: (id: string, value: string) => void;
  readonly reset: () => void;
}

function initialSplit(existing: ExpenseView | null, participants: readonly ParticipantData[]): SplitDraft {
  const mode = existing?.split?.mode ?? "equal";
  const selected = existing?.shares.map((share) => share.participantId) ?? participants.map((person) => person.id);
  return {
    custom: mode !== "equal" || selected.length !== participants.length,
    mode,
    selected,
    values: Object.fromEntries(
      existing?.split?.entries.map((entry) => [entry.participantId, String(entry.value)]) ?? [],
    ),
  };
}

export function useExpenseSplit(
  existing: ExpenseView | null,
  participants: readonly ParticipantData[],
  amount: string,
): ExpenseSplitState {
  const [draft, setDraft] = useState(() => initialSplit(existing, participants));
  const ids = participants.map((person) => person.id);
  const mode = draft.custom ? draft.mode : "equal";
  const selected = draft.custom ? draft.selected : ids;
  const config: ExpenseSplit = {
    mode,
    entries: selected.map((participantId) => ({
      participantId,
      value: mode === "equal" ? 1 : Number(draft.values[participantId] ?? (mode === "shares" ? "1" : "0")),
    })),
  };
  const calculation = calculateExpenseSplit(Number(amount), config, ids);
  const result = Effect.runSync(Effect.result(calculation));
  function changeMode(next: SplitMode): void {
    if (next !== draft.mode) {
      setDraft({ ...draft, mode: next, values: {} });
    }
  }
  function select(id: string, checked: boolean): void {
    setDraft({
      ...draft,
      selected: checked ? [...draft.selected, id] : draft.selected.filter((entry) => entry !== id),
    });
  }
  return {
    draft,
    config,
    preview: result._tag === "Success" ? result.success : [],
    error: result._tag === "Failure" ? result.failure.message : null,
    changeMode,
    select,
    selectAll: (checked: boolean): void => {
      setDraft({ ...draft, selected: checked ? ids : [] });
    },
    customize: (custom: boolean): void => {
      setDraft({ ...draft, custom });
    },
    changeValue: (id: string, value: string): void => {
      setDraft({ ...draft, values: { ...draft.values, [id]: value } });
    },
    reset: (): void => {
      setDraft(initialSplit(null, participants));
    },
  };
}
