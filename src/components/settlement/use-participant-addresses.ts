import { fillDraftAddresses, initialSettlementDraft } from "@/lib/settlement-draft";
import type { SettlementDraft } from "@/lib/settlement-draft";
import { newParticipantAddresses } from "@/server/participant-addresses";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import type { Dispatch, SetStateAction } from "react";

interface ParticipantAddresses {
  readonly addressPending: boolean;
  readonly addressError: string | null;
  readonly generateAddresses: (ids: readonly string[]) => void;
}

export function useParticipantAddresses(setDraft: Dispatch<SetStateAction<SettlementDraft>>): ParticipantAddresses {
  const [addressPending, startTransition] = useTransition();
  const [addressError, setAddressError] = useState<string | null>(null);
  const initialized = useRef(false);
  const generateAddresses = useCallback(
    (ids: readonly string[]): void => {
      if (ids.length === 0) {
        return;
      }
      setAddressError(null);
      startTransition(async () => {
        try {
          const result = await newParticipantAddresses({ data: { count: ids.length } });
          if (result.ok) {
            setDraft((current) => fillDraftAddresses(current, ids, result.addresses));
          } else {
            setAddressError(result.message);
          }
        } catch {
          setAddressError("Could not generate test addresses. Retry or enter payout addresses manually.");
        }
      });
    },
    [setDraft],
  );
  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      generateAddresses(initialSettlementDraft.users.map((user) => user.id));
    }
  }, [generateAddresses]);
  return { addressPending, addressError, generateAddresses };
}
