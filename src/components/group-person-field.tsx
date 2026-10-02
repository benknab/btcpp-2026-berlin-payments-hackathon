import { LabeledField } from "@/components/labeled-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { PersonInput } from "@/components/use-group-create";
import { MAX_PARTICIPANT_NAME } from "@/domain/group-input";
import { XIcon } from "lucide-react";
import type { ReactNode } from "react";

interface GroupPersonProps {
  readonly person: PersonInput;
  readonly number: number;
  readonly removable: boolean;
  readonly onChange: (id: number, value: string) => void;
  readonly onRemove: (id: number) => void;
}

export function GroupPersonField({ person, number, removable, onChange, onRemove }: GroupPersonProps): ReactNode {
  const controls = (
    <div className="flex items-center gap-2">
      <Input
        id={`person-${person.id}`}
        placeholder="Friend’s name"
        value={person.name}
        required
        maxLength={MAX_PARTICIPANT_NAME}
        onChange={(event) => {
          onChange(person.id, event.target.value);
        }}
      />
      {removable ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={`Remove person ${number}`}
          onClick={() => {
            onRemove(person.id);
          }}
        >
          <XIcon data-icon="inline-start" />
        </Button>
      ) : null}
    </div>
  );
  return (
    <LabeledField id={`person-${person.id}`} label={`Person ${number}`}>
      {controls}
    </LabeledField>
  );
}
