import { useAction } from "@/components/use-action";
import { useEventWallet } from "@/components/use-event-wallet";
import { NewGroup } from "@/domain/group-input";
import { isPayoutDestination, PAYOUT_DESTINATION_ERROR } from "@/domain/payout-destination";
import { newGroup } from "@/server/groups";
import { useNavigate } from "@tanstack/react-router";
import { Schema } from "effect";
import { useState } from "react";

interface EventCreateState {
  readonly pending: boolean;
  readonly error: string | null;
  readonly submit: (form: Readonly<FormData>) => void;
}

function formText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function eventCreationError(input: typeof NewGroup.Type): string | null {
  if (!isPayoutDestination(input.organizerLnurl)) {
    return PAYOUT_DESTINATION_ERROR;
  }
  return Schema.is(NewGroup)(input) ? null : "Enter an event name and a different name for each participant.";
}

export function useEventCreate(): EventCreateState {
  const navigate = useNavigate();
  const action = useAction();
  const createWallet = useEventWallet();
  const [validation, setValidation] = useState<string | null>(null);

  function submit(form: Readonly<FormData>): void {
    const input = {
      name: formText(form.get("eventName")),
      organizerName: formText(form.get("organizerName")),
      organizerLnurl: formText(form.get("organizerLnurl")),
      participantNames: form.getAll("participantName").map((value: unknown) => formText(value)),
    };
    const error = eventCreationError(input);
    setValidation(error);
    if (error !== null) {
      return;
    }
    action.run(async (): Promise<void> => {
      const arkAddress = await createWallet();
      const created = await newGroup({ data: { ...input, arkAddress } });
      await navigate({ to: "/groups/$inviteKey", params: { inviteKey: created.inviteKey } });
    }, "Could not create the event. Try again.");
  }

  return { pending: action.pending, error: validation ?? action.error, submit };
}
