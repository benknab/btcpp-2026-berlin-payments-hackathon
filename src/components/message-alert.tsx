import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { ReactNode } from "react";

interface MessageAlertProps {
  readonly title: string;
  readonly children: ReactNode;
  readonly variant?: "default" | "destructive";
}

export function MessageAlert({ title, children, variant }: MessageAlertProps): ReactNode {
  return (
    <Alert variant={variant}>
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{children}</AlertDescription>
    </Alert>
  );
}
