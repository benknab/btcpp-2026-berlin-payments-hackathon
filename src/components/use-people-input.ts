import { useRef, useState } from "react";

export interface PersonInput {
  readonly id: number;
  readonly name: string;
}

interface PeopleInputState {
  readonly people: readonly PersonInput[];
  readonly addPerson: () => void;
  readonly changePerson: (id: number, value: string) => void;
  readonly removePerson: (id: number) => void;
}

export function usePeopleInput(): PeopleInputState {
  const [people, setPeople] = useState<readonly PersonInput[]>([{ id: 1, name: "" }]);
  const nextId = useRef(1);
  return {
    people,
    addPerson: (): void => {
      nextId.current += 1;
      setPeople([...people, { id: nextId.current, name: "" }]);
    },
    changePerson: (id, value): void => {
      setPeople(people.map((person) => (person.id === id ? { ...person, name: value } : person)));
    },
    removePerson: (id): void => {
      setPeople(people.filter((person) => person.id !== id));
    },
  };
}
