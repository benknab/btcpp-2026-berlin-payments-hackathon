import type { Pot } from "@/lib/pot";
import type { SettlementResult, SettlementSetupInput } from "@/lib/settlement";
import { createSettlement, openSettlement, paySettlement, refreshSettlement } from "@/server/settlement";
import { useRef, useState } from "react";

type PendingAction = "open" | "create" | "refresh" | "pay";
interface SettlementController {
  readonly accessCode: string;
  readonly handleAccessCodeChange: (value: string) => void;
  readonly connected: boolean;
  readonly pot: Pot | null;
  readonly error: string | null;
  readonly pending: PendingAction | null;
  readonly needsRefresh: boolean;
  readonly handleOpen: () => void;
  readonly handleCreate: (setup: SettlementSetupInput) => void;
  readonly handleRefresh: () => void;
  readonly handlePay: () => void;
  readonly handleDisconnect: () => void;
}

export function useSettlement(): SettlementController {
  const [accessCode, setAccessCode] = useState("");
  const [connected, setConnected] = useState(false);
  const [pot, setPot] = useState<Pot | null>(null);
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
          setConnected(true);
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
  }

  return {
    accessCode,
    handleAccessCodeChange: setAccessCode,
    connected,
    pot,
    error,
    pending,
    needsRefresh,
    handleOpen: (): void => {
      run("open", () => openSettlement({ data: { accessCode } }));
    },
    handleCreate: (setup): void => {
      run("create", () => createSettlement({ data: { accessCode, setup } }));
    },
    handleRefresh: (): void => {
      if (pot !== null) {
        run("refresh", () => refreshSettlement({ data: { accessCode, id: pot.id } }));
      }
    },
    handlePay: (): void => {
      if (pot !== null) {
        run("pay", () => paySettlement({ data: { accessCode, id: pot.id, reviewed: true } }));
      }
    },
    handleDisconnect: (): void => {
      setAccessCode("");
      setConnected(false);
      setPot(null);
      setError(null);
      setNeedsRefresh(false);
    },
  };
}
