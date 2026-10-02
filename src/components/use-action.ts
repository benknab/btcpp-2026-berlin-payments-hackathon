import { PaymentError } from "@/domain/payment-error";
import { useRef, useState } from "react";

interface ActionState {
  readonly pending: boolean;
  readonly error: string | null;
  readonly run: (action: () => Promise<void>, failureMessage: string) => void;
}

export function useAction(): ActionState {
  const [pending, setPending] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const inFlight = useRef(false);

  function run(action: () => Promise<void>, failureMessage: string): void {
    if (inFlight.current) {
      return;
    }
    setPending(true);
    inFlight.current = true;
    setActionError(null);
    action()
      .catch((error: unknown): void => {
        setActionError(error instanceof PaymentError ? error.message : failureMessage);
      })
      .finally((): void => {
        inFlight.current = false;
        setPending(false);
      });
  }

  return { pending, error: actionError, run };
}
