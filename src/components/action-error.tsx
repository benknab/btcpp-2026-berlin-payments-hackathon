import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { ReactNode } from "react";

export function ActionError({ message }: { readonly message: string | null }): ReactNode {
  if (message === null) {
    return null;
  }
  return (
    <Alert variant="destructive">
      <AlertTitle>Something needs attention</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}
