import type { SettlementDocument, SettlementResult, SettlementSetupInput } from "@/lib/settlement";
import {
  getSettlement,
  paySettlement,
  prepareSettlement,
  refreshSettlement,
  saveSettlementDetails,
} from "@/server/settlement";
import { useRef, useState } from "react";

type PendingAction = "save" | "prepare" | "refresh" | "pay" | "reload";
interface SettlementController {
  readonly pot: SettlementDocument;
  readonly error: string | null;
  readonly pending: PendingAction | null;
  readonly needsRefresh: boolean;
  readonly handleSave: (setup: SettlementSetupInput) => void;
  readonly handlePrepare: () => void;
  readonly handleRefresh: () => void;
  readonly handlePay: () => void;
  readonly handleReload: () => void;
}

interface SettlementRequestState {
  readonly pot: SettlementDocument;
  readonly error: string | null;
  readonly pending: PendingAction | null;
  readonly needsRefresh: boolean;
  readonly run: (action: PendingAction, request: () => Promise<SettlementResult>) => void;
}

function useSettlementRequest(initialPot: SettlementDocument): SettlementRequestState {
  const [pot, setPot] = useState(initialPot);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [needsRefresh, setNeedsRefresh] = useState(false);
  const busy = useRef(false);

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
    request()
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
        setError(
          "Request interrupted. Reload or refresh this pot before proceeding; a payment may already have completed.",
        );
        setNeedsRefresh(true);
      })
      .finally((): void => {
        busy.current = false;
        setPending(null);
      });
  }

  return { pot, error, pending, needsRefresh, run };
}

export function useSettlement(initialPot: SettlementDocument): SettlementController {
  const { pot, error, pending, needsRefresh, run } = useSettlementRequest(initialPot);

  return {
    pot,
    error,
    pending,
    needsRefresh,
    handleSave: (setup): void => {
      run("save", () => saveSettlementDetails({ data: { id: pot.id, setup } }));
    },
    handlePrepare: (): void => {
      run("prepare", () => prepareSettlement({ data: { id: pot.id } }));
    },
    handleRefresh: (): void => {
      run("refresh", () => refreshSettlement({ data: { id: pot.id } }));
    },
    handlePay: (): void => {
      run("pay", () => paySettlement({ data: { id: pot.id, reviewed: true } }));
    },
    handleReload: (): void => {
      run("reload", async (): Promise<SettlementResult> => {
        const saved = await getSettlement({ data: { id: pot.id } });
        return saved === null ? { ok: false, pot: null, message: "Pot not found" } : { ok: true, pot: saved };
      });
    },
  };
}
