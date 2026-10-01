import { useAction } from "@/components/use-action";
import { NewGroup } from "@/domain/group-input";
import { newGroup } from "@/server/groups";
import { useNavigate } from "@tanstack/react-router";
import { Schema } from "effect";
import { useRef, useState } from "react";

export interface PersonInput {
  readonly id: number;
  readonly name: string;
}

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
  const [people, setPeople] = useState<readonly PersonInput[]>([{ id: 1, name: "" }]);
  const nextId = useRef(1);
  const [validation, setValidation] = useState<string | null>(null);

  function addPerson(): void {
    nextId.current += 1;
    setPeople([...people, { id: nextId.current, name: "" }]);
  }
  function changePerson(id: number, value: string): void {
    setPeople(people.map((person) => (person.id === id ? { ...person, name: value } : person)));
  }
  function removePerson(id: number): void {
    setPeople(people.filter((person) => person.id !== id));
  }
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
