import { useRouter } from "@tanstack/react-router";

import { useAction } from "./use-action";

async function runAndRefresh(operation: () => Promise<void>, refresh: () => Promise<void>): Promise<void> {
  try {
    await operation();
  } finally {
    await refresh();
  }
}

export function useEventAction(): ReturnType<typeof useAction> {
  const router = useRouter();
  const action = useAction();
  function run(operation: () => Promise<void>, message: string): void {
    action.run(() => runAndRefresh(operation, () => router.invalidate()), message);
  }
  return { ...action, run };
}
