import { useRouter } from "@tanstack/react-router";

import { useAction } from "./use-action";

export function useEventAction(): ReturnType<typeof useAction> {
  const router = useRouter();
  const action = useAction();
  function run(operation: () => Promise<void>, message: string): void {
    action.run(async () => {
      await operation();
      await router.invalidate();
    }, message);
  }
  return { ...action, run };
}
