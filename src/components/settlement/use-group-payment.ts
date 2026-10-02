import { useAction } from "@/components/use-action";
import type { GroupActionResult } from "@/server/group-action-result";
import { checkGroupDeposits, closeGroup, payGroup } from "@/server/group-payments";
import { useRouter } from "@tanstack/react-router";
import { useState } from "react";

type ActionKind = "close" | "refresh" | "pay";
interface GroupPaymentState {
  readonly pending: boolean;
  readonly error: string | null;
  readonly run: (kind: ActionKind) => void;
  readonly refreshView: () => void;
}

export function useGroupPayment(inviteKey: string, fingerprint: string): GroupPaymentState {
  const action = useAction();
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  function request(kind: ActionKind): Promise<GroupActionResult> {
    if (kind === "close") {
      return closeGroup({ data: { inviteKey, fingerprint, reviewed: true } });
    }
    if (kind === "refresh") {
      return checkGroupDeposits({ data: { inviteKey } });
    }
    return payGroup({ data: { inviteKey, reviewed: true } });
  }
  function run(kind: ActionKind): void {
    action.run(async (): Promise<void> => {
      setMessage(null);
      try {
        const result = await request(kind);
        if (!result.ok) {
          setMessage(result.message);
        }
      } catch {
        setMessage("Connection lost. Refresh the status; never manually resend an uncertain payout.");
      }
      // A failed request can still have persisted a group lock or a payout intent.
      await router.invalidate();
    }, "Could not read the saved status. Refresh before taking another action.");
  }
  function refreshView(): void {
    action.run(async (): Promise<void> => {
      await router.invalidate();
    }, "Could not refresh the saved status.");
  }
  return { pending: action.pending, error: message ?? action.error, run, refreshView };
}
