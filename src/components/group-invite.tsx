import { ActionError } from "@/components/action-error";
import { ReadOnlyField } from "@/components/read-only-field";
import { SectionCard } from "@/components/section-card";
import { Button } from "@/components/ui/button";
import { useAction } from "@/components/use-action";
import { CheckIcon, CopyIcon } from "lucide-react";
import { useState } from "react";
import type { ReactNode } from "react";

export function GroupInvite({ inviteKey, origin }: { readonly inviteKey: string; readonly origin: string }): ReactNode {
  const url = `${origin}/groups/${inviteKey}`;
  const [copied, setCopied] = useState(false);
  const action = useAction();

  function copy(): void {
    action.run(async (): Promise<void> => {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    }, "Select the link and copy it manually.");
  }

  return (
    <SectionCard title="Invite participants" contentClassName="flex flex-col gap-3">
      <ReadOnlyField id="invite-link" label="Invitation link" value={url} selectOnFocus />
      <Button variant="outline" className="w-full" onClick={copy} disabled={action.pending}>
        {copied ? (
          <CheckIcon data-icon="inline-start" aria-hidden="true" />
        ) : (
          <CopyIcon data-icon="inline-start" aria-hidden="true" />
        )}
        {copied ? "Link copied" : "Copy invitation"}
      </Button>
      <output className="sr-only" aria-live="polite">
        {copied ? "Invitation link copied" : ""}
      </output>
      <ActionError message={action.error} />
    </SectionCard>
  );
}
