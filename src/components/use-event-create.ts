import { useAction } from "@/components/use-action";
import { useEventWallet } from "@/components/use-event-wallet";
import { NewGroup } from "@/domain/group-input";
import { DUPLICATE_LNURL_ERROR, hasUniqueLnurls, isLnurl, LNURL_ERROR } from "@/domain/lnurl";
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

function receivingAddressError(values: readonly string[]): string | null {
  if (values.some((value) => value !== "" && !isLnurl(value))) {
    return LNURL_ERROR;
  }
  return hasUniqueLnurls(values) ? null : DUPLICATE_LNURL_ERROR;
}

export function useEventCreate(): EventCreateState {
  const navigate = useNavigate();
  const action = useAction();
  const createWallet = useEventWallet();
  const [validation, setValidation] = useState<string | null>(null);

  function submit(form: Readonly<FormData>): void {
    const participantLnurls = form.getAll("participantLnurl").map((value: unknown) => formText(value));
    const addressError = receivingAddressError(participantLnurls);
    setValidation(addressError);
    if (addressError !== null) {
      return;
    }
    const input = {
      name: formText(form.get("eventName")),
      organizerName: formText(form.get("organizerName")),
      participantNames: form.getAll("participantName").map((value: unknown) => formText(value)),
      participantLnurls: participantLnurls.map((value) => (value === "" ? null : value)),
    };
    if (!Schema.is(NewGroup)(input)) {
      setValidation("Enter an event name and a different name for each participant.");
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
