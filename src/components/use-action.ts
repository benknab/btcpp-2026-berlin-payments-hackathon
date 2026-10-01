import { useRef, useState } from "react";

interface ActionState {
  readonly pending: boolean;
  readonly error: string | null;
  readonly run: (action: () => Promise<void>, failureMessage: string) => void;
}

export function useAction(): ActionState {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);

  function run(action: () => Promise<void>, failureMessage: string): void {
    if (inFlight.current) {
      return;
    }
    setPending(true);
    inFlight.current = true;
    setError(null);
    action()
      .catch((): void => {
        setError(failureMessage);
      })
      .finally((): void => {
        inFlight.current = false;
        setPending(false);
      });
  }

  return { pending, error, run };
}
