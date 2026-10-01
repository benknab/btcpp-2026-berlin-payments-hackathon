import type { Pot } from "@/lib/pot";
import type { SettlementResult, SettlementSetupInput } from "@/lib/settlement";
import { createSettlement, openSettlement, paySettlement, refreshSettlement } from "@/server/settlement";
import { useCallback, useEffect, useRef, useState } from "react";

type PendingAction = "open" | "create" | "refresh" | "pay";
interface SettlementController {
  readonly pot: Pot | null;
  readonly error: string | null;
  readonly pending: PendingAction | null;
  readonly needsRefresh: boolean;
  readonly handleOpen: () => void;
  readonly handleCreate: (setup: SettlementSetupInput) => void;
  readonly handleRefresh: () => void;
  readonly handlePay: () => void;
}

export function useSettlement(): SettlementController {
  const [pot, setPot] = useState<Pot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingAction | null>("open");
  const [needsRefresh, setNeedsRefresh] = useState(false);
  const busy = useRef(false);

  const finish = useCallback((request: Readonly<Promise<SettlementResult>>): void => {
    request
      .then((result): void => {
        if (result.pot !== null) {
          setPot(result.pot);
        }
        if (result.ok) {
          setNeedsRefresh(false);
        } else {
          setError(result.message);
        }
      })
      .catch((): void => {
        setError("Request interrupted. Refresh the pot before proceeding; a payout may already have completed.");
        setNeedsRefresh(true);
      })
      .finally((): void => {
        busy.current = false;
        setPending(null);
      });
  }, []);

  function run(action: PendingAction, request: () => Promise<SettlementResult>): void {
    if (busy.current) {
      return;
    }
    busy.current = true;
    setPending(action);
    setError(null);
    if (action === "pay") {
      setNeedsRefresh(true);
    }
    finish(request());
  }

  useEffect(() => {
    if (!busy.current) {
      busy.current = true;
      finish(openSettlement());
    }
  }, [finish]);

  return {
    pot,
    error,
    pending,
    needsRefresh,
    handleOpen: (): void => {
      run("open", () => openSettlement());
    },
    handleCreate: (setup): void => {
      run("create", () => createSettlement({ data: { setup } }));
    },
    handleRefresh: (): void => {
      if (pot !== null) {
        run("refresh", () => refreshSettlement({ data: { id: pot.id } }));
      }
    },
    handlePay: (): void => {
      if (pot !== null) {
        run("pay", () => paySettlement({ data: { id: pot.id, reviewed: true } }));
      }
    },
  };
}
