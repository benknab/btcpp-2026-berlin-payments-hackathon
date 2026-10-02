import { useParticipantAddresses } from "@/components/settlement/use-participant-addresses";
import type { Obligation } from "@/lib/pot";
import type { SettlementSetupInput } from "@/lib/settlement";
import {
  canAddDraftUser,
  initialSettlementDraft,
  prepareSettlementDraft,
  removeDraftUser,
} from "@/lib/settlement-draft";
import type { DraftDebt, DraftUser, SettlementDraft } from "@/lib/settlement-draft";
import { Effect } from "effect";
import { useState } from "react";
import type { Dispatch, SetStateAction } from "react";

export interface DraftPreview {
  readonly setup: SettlementSetupInput;
  readonly obligations: readonly Obligation[];
}

export interface DraftController {
  readonly draft: SettlementDraft;
  readonly showErrors: boolean;
  readonly addressPending: boolean;
  readonly addressError: string | null;
  readonly handleAddressRetry: () => void;
  readonly preview: DraftPreview | null;
  readonly handlePrepare: () => SettlementSetupInput | null;
  readonly handleUserChange: (user: DraftUser) => void;
  readonly handleDebtChange: (debt: DraftDebt) => void;
  readonly handleUserRemove: (id: string) => void;
  readonly handleDebtRemove: (id: string) => void;
  readonly handleUserAdd: () => void;
  readonly handleDebtAdd: () => void;
}

function draftEdits(
  setDraft: Dispatch<SetStateAction<SettlementDraft>>,
): Pick<
  DraftController,
  "handleUserChange" | "handleDebtChange" | "handleUserRemove" | "handleDebtRemove" | "handleDebtAdd"
> {
  return {
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
    handleDebtAdd: (): void => {
      setDraft((current) => ({
        ...current,
        debts: [
          ...current.debts,
          { id: crypto.randomUUID(), from: current.users[0]?.id ?? "", to: current.users[1]?.id ?? "", amount: "" },
        ],
      }));
    },
  };
}

export function useSettlementDraft(): DraftController {
  const [draft, setDraft] = useState(initialSettlementDraft);
  const [showErrors, setShowErrors] = useState(false);
  const { addressPending, addressError, generateAddresses } = useParticipantAddresses(setDraft);
  const result = Effect.runSync(Effect.result(prepareSettlementDraft(draft)));
  const preview = result._tag === "Success" ? result.success : null;
  return {
    ...draftEdits(setDraft),
    draft,
    showErrors,
    addressPending,
    addressError,
    handleAddressRetry: (): void => {
      generateAddresses(draft.users.filter((user) => user.arkAddress.trim() === "").map((user) => user.id));
    },
    preview,
    handlePrepare: (): SettlementSetupInput | null => {
      setShowErrors(true);
      return preview?.setup ?? null;
    },
    handleUserAdd: (): void => {
      if (!canAddDraftUser(draft) || addressPending) {
        return;
      }
      const id = crypto.randomUUID();
      setDraft((current) => ({
        ...current,
        users: [...current.users, { id, name: "", arkAddress: "" }],
      }));
      generateAddresses([id]);
    },
  };
}
