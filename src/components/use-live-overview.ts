import { useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";

const REFRESH_INTERVAL_MS = 15_000;

export function useLiveOverview(active: boolean): string | null {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let refreshing = false;
    let disposed = false;
    function refresh(): void {
      if (document.visibilityState !== "visible" || refreshing) {
        return;
      }
      refreshing = true;
      router
        .invalidate()
        .then((): void => {
          if (!disposed) {
            setError(null);
          }
        })
        .catch((): void => {
          if (!disposed) {
            setError("Could not refresh settlement. Reconnecting…");
          }
        })
        .finally((): void => {
          refreshing = false;
        });
    }
    const timer = active ? globalThis.setInterval(refresh, REFRESH_INTERVAL_MS) : null;
    return (): void => {
      disposed = true;
      if (timer !== null) {
        globalThis.clearInterval(timer);
      }
    };
  }, [active, router]);
  return error;
}
