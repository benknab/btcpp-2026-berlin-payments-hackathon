import { useState } from "react";

interface ActionState {
  readonly pending: boolean;
  readonly error: string | null;
  readonly run: (action: () => Promise<void>, failureMessage: string) => void;
}

export function useAction(): ActionState {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function run(action: () => Promise<void>, failureMessage: string): void {
    if (pending) {
      return;
    }
    setPending(true);
    setError(null);
    action()
      .catch((): void => {
        setError(failureMessage);
      })
      .finally((): void => {
        setPending(false);
      });
  }

  return { pending, error, run };
}
