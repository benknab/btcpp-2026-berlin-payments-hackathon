import type { ReactNode } from "react";

import { ReadOnlyField } from "./read-only-field";
import { FieldError } from "./ui/field";
import { Separator } from "./ui/separator";
import { Spinner } from "./ui/spinner";

interface DemoFeedbackProps {
  readonly pending: boolean;
  readonly error: string | null;
  readonly link: string | null;
  readonly copied: boolean;
}

export function DemoMenuFeedback({ pending, error, link, copied }: DemoFeedbackProps): ReactNode {
  if (!pending && error === null && link === null) {
    return null;
  }
  return (
    <div className="flex flex-col gap-3" aria-live="polite">
      <Separator />
      <div className="flex flex-col gap-3 px-4 pb-4">
        {pending && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Spinner />
            Running…
          </p>
        )}
        {error !== null && <FieldError>{error}</FieldError>}
        {link !== null && (
          <ReadOnlyField
            id="demo-event-link"
            label={copied ? "Link copied" : "Event link"}
            value={link}
            selectOnFocus
          />
        )}
      </div>
    </div>
  );
}
