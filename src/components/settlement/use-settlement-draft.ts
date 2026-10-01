import type { Obligation } from "@/lib/pot";
import type { SettlementSetupInput } from "@/lib/settlement";
import { initialSettlementDraft, prepareSettlementDraft, removeDraftUser } from "@/lib/settlement-draft";
import type { DraftDebt, DraftUser, SettlementDraft } from "@/lib/settlement-draft";
import { Effect } from "effect";
import { useState } from "react";

export interface DraftPreview {
  readonly setup: SettlementSetupInput;
  readonly obligations: readonly Obligation[];
}

export interface DraftController {
  readonly draft: SettlementDraft;
  readonly showErrors: boolean;
  readonly preview: DraftPreview | null;
  readonly handlePrepare: () => SettlementSetupInput | null;
  readonly handleUserChange: (user: DraftUser) => void;
  readonly handleDebtChange: (debt: DraftDebt) => void;
  readonly handleUserRemove: (id: string) => void;
  readonly handleDebtRemove: (id: string) => void;
  readonly handleUserAdd: () => void;
  readonly handleDebtAdd: () => void;
}

export function useSettlementDraft(): DraftController {
  const [draft, setDraft] = useState(initialSettlementDraft);
  const [showErrors, setShowErrors] = useState(false);
  const result = Effect.runSync(Effect.result(prepareSettlementDraft(draft)));
  const preview = result._tag === "Success" ? result.success : null;
  return {
    draft,
    showErrors,
    preview,
    handlePrepare: (): SettlementSetupInput | null => {
      setShowErrors(true);
      return preview?.setup ?? null;
    },
    handleUserChange: (user): void => {
      setDraft((current) => ({
        ...current,
        users: current.users.map((entry) => (entry.id === user.id ? user : entry)),
      }));
    },
    handleDebtChange: (debt): void => {
      setDraft((current) => ({
        ...current,
        debts: current.debts.map((entry) => (entry.id === debt.id ? debt : entry)),
      }));
    },
    handleUserRemove: (id): void => {
      setDraft((current) => removeDraftUser(current, id));
    },
    handleDebtRemove: (id): void => {
      setDraft((current) => ({ ...current, debts: current.debts.filter((debt) => debt.id !== id) }));
    },
    handleUserAdd: (): void => {
      setDraft((current) => ({
        ...current,
        users: [...current.users, { id: crypto.randomUUID(), name: "", arkAddress: "" }],
      }));
    },
    handleDebtAdd: (): void => {
      setDraft((current) => ({
        ...current,
        debts: [
          ...current.debts,
          {
            id: crypto.randomUUID(),
            from: current.users[0]?.id ?? "",
            to: current.users[1]?.id ?? "",
            amount: "",
          },
        ],
      }));
    },
  };
}
