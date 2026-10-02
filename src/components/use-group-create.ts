import { useAction } from "@/components/use-action";
import { usePeopleInput } from "@/components/use-people-input";
import type { PersonInput } from "@/components/use-people-input";
import { NewGroup } from "@/domain/group-input";
import { newGroup } from "@/server/groups";
import { useNavigate } from "@tanstack/react-router";
import { Schema } from "effect";
import { useState } from "react";

export type { PersonInput } from "@/components/use-people-input";

interface GroupCreateState {
  readonly name: string;
  readonly organizerName: string;
  readonly people: readonly PersonInput[];
  readonly pending: boolean;
  readonly error: string | null;
  readonly setName: (value: string) => void;
  readonly setOrganizerName: (value: string) => void;
  readonly addPerson: () => void;
  readonly changePerson: (id: number, value: string) => void;
  readonly removePerson: (id: number) => void;
  readonly handleSubmit: (event: { readonly preventDefault: () => void }) => void;
}

export function useGroupCreate(): GroupCreateState {
  const navigate = useNavigate();
  const action = useAction();
  const [name, setName] = useState("");
  const [organizerName, setOrganizerName] = useState("");
  const { people, addPerson, changePerson, removePerson } = usePeopleInput();
  const [validation, setValidation] = useState<string | null>(null);

  function handleSubmit(event: { readonly preventDefault: () => void }): void {
    event.preventDefault();
    const data = {
      name: name.trim(),
      organizerName: organizerName.trim(),
      participantNames: people.map((person) => person.name.trim()),
    };
    if (!Schema.is(NewGroup)(data)) {
      setValidation("Give the group a name and enter a different name for each participant.");
      return;
    }
    setValidation(null);
    action.run(async (): Promise<void> => {
      const created = await newGroup({ data });
      await navigate({ to: "/groups/$inviteKey", params: { inviteKey: created.inviteKey } });
    }, "Could not create the group. Check your connection and try again.");
  }
  return {
    name,
    organizerName,
    people,
    pending: action.pending,
    error: validation ?? action.error,
    setName,
    setOrganizerName,
    addPerson,
    changePerson,
    removePerson,
    handleSubmit,
  };
}
