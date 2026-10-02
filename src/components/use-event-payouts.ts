import { useEventAction } from "./use-event-action";

async function payCreditors(inviteKey: string, arkAddress: string): Promise<void> {
  const { payEventCreditors } = await import("@/browser/event-payouts");
  await payEventCreditors(inviteKey, arkAddress);
}

export function useEventPayouts(
  inviteKey: string,
  arkAddress: string,
): {
  readonly pending: boolean;
  readonly error: string | null;
  readonly handlePay: () => void;
} {
  const action = useEventAction();
  function handlePay(): void {
    action.run(
      () => payCreditors(inviteKey, arkAddress),
      "Payouts stopped. Check the wallet balance, fee reserve, and receiving services. Retry to reconcile an in-flight payment.",
    );
  }
  return { pending: action.pending, error: action.error, handlePay };
}
