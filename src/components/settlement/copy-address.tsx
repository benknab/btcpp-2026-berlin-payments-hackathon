import { Button } from "@/components/ui/button";
import { CopyIcon } from "lucide-react";
import { useState } from "react";
import type { ReactNode } from "react";

export function CopyAddress({ address }: Readonly<{ address: string }>): ReactNode {
  const [feedback, setFeedback] = useState<string | null>(null);
  function copy(): void {
    Promise.resolve()
      .then(() => navigator.clipboard.writeText(address))
      .then((): void => {
        setFeedback("Copied.");
      })
      .catch((): void => {
        setFeedback("Select and copy the address above.");
      });
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button type="button" variant="outline" size="sm" onClick={copy}>
        <CopyIcon data-icon="inline-start" /> Copy deposit address
      </Button>
      <p className="text-sm text-muted-foreground" aria-live="polite">
        {feedback}
      </p>
    </div>
  );
}
