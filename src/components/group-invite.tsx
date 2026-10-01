import { ActionError } from "@/components/action-error";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useAction } from "@/components/use-action";
import { CopyIcon } from "lucide-react";
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
    <Card>
      <CardHeader>
        <CardTitle>Bring everyone in</CardTitle>
        <CardDescription>Send this link to your friends. They can view the group and record expenses.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="invite-link">Invitation link</FieldLabel>
            <Input
              id="invite-link"
              value={url}
              readOnly
              onFocus={(event) => {
                event.currentTarget.select();
              }}
            />
          </Field>
        </FieldGroup>
        <Button variant="outline" className="self-start" onClick={copy} disabled={action.pending}>
          <CopyIcon data-icon="inline-start" /> {copied ? "Link copied" : "Copy invitation"}
        </Button>
        <p className="text-xs text-muted-foreground" aria-live="polite">
          {copied
            ? "Ready to share with your friends."
            : "Anyone with this link has group access. It never grants organizer payment authority."}
        </p>
        <ActionError message={action.error} />
      </CardContent>
    </Card>
  );
}
