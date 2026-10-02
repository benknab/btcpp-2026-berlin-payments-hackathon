import { ActionError } from "@/components/action-error";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
        <CardTitle>Invite participants</CardTitle>
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
        <ActionError message={action.error} />
      </CardContent>
    </Card>
  );
}
