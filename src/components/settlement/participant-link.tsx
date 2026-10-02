import { ActionError } from "@/components/action-error";
import { ReadOnlyField } from "@/components/read-only-field";
import { Button, buttonVariants } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { useParticipantLink } from "./use-participant-link";

export function ParticipantLink({
  inviteKey,
  participantId,
  name,
  origin,
}: Readonly<{ inviteKey: string; participantId: string; name: string; origin: string }>): ReactNode {
  const action = useParticipantLink(inviteKey, participantId, origin);
  return (
    <section className="flex flex-col gap-3">
      <Button variant="outline" className="self-start" onClick={action.handleGenerate} disabled={action.pending}>
        {action.accessKey === null ? `Create private link for ${name}` : `Replace ${name}’s private link`}
      </Button>
      {action.accessKey !== null && (
        <ReadOnlyField
          id={`private-${participantId}`}
          label={`${name}’s private address-setup link`}
          value={`${origin}/participants/${action.accessKey}`}
          selectOnFocus
        />
      )}
      {action.accessKey !== null && (
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={action.handleCopy} disabled={action.pending}>
            {action.copied ? "Copied" : `Copy ${name}’s link`}
          </Button>
          <Link
            to="/participants/$accessKey"
            params={{ accessKey: action.accessKey }}
            target="_blank"
            rel="noreferrer"
            className={buttonVariants({ variant: "ghost" })}
          >
            Open personal setup
          </Link>
        </div>
      )}
      <ActionError message={action.error} />
    </section>
  );
}
