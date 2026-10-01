import { ActionError } from "@/components/action-error";
import { Button, buttonVariants } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useAction } from "@/components/use-action";
import { participantLink } from "@/server/participant-payments";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import type { ReactNode } from "react";

export function ParticipantLink({
  inviteKey,
  participantId,
  name,
  origin,
}: Readonly<{
  inviteKey: string;
  participantId: string;
  name: string;
  origin: string;
}>): ReactNode {
  const [accessKey, setAccessKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const action = useAction();
  function generate(): void {
    action.run(async (): Promise<void> => {
      const result = await participantLink({ data: { inviteKey, participantId } });
      setAccessKey(result.accessKey);
      setCopied(false);
    }, "Could not generate this private link. Check organizer access and whether settlement has started.");
  }
  function copy(): void {
    if (accessKey === null) {
      return;
    }
    action.run(async (): Promise<void> => {
      await navigator.clipboard.writeText(`${origin}/participants/${accessKey}`);
      setCopied(true);
    }, "Select the private link and copy it manually.");
  }
  return (
    <section className="flex flex-col gap-3">
      <Button variant="outline" className="self-start" onClick={generate} disabled={action.pending}>
        {accessKey === null ? `Create private link for ${name}` : `Replace ${name}’s private link`}
      </Button>
      {accessKey === null ? null : (
        <>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor={`private-${participantId}`}>{name}’s private address-setup link</FieldLabel>
              <Input
                id={`private-${participantId}`}
                value={`${origin}/participants/${accessKey}`}
                readOnly
                onFocus={(event) => {
                  event.currentTarget.select();
                }}
              />
            </Field>
          </FieldGroup>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={copy} disabled={action.pending}>
              {copied ? "Copied" : `Copy ${name}’s link`}
            </Button>
            <Link
              to="/participants/$accessKey"
              params={{ accessKey }}
              target="_blank"
              rel="noreferrer"
              className={buttonVariants({ variant: "ghost" })}
            >
              Open personal setup
            </Link>
          </div>
        </>
      )}
      <ActionError message={action.error} />
    </section>
  );
}
