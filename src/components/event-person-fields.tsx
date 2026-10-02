import { LnurlField } from "@/components/lnurl-field";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";
import { MAX_PARTICIPANT_NAME } from "@/domain/group-input";
import { XIcon } from "lucide-react";
import type { ReactNode } from "react";

interface EventPersonFieldsProps {
  readonly id: number;
  readonly number: number;
  readonly removable: boolean;
  readonly onRemove: (id: number) => void;
}

export function EventPersonFields({ id, number, removable, onRemove }: EventPersonFieldsProps): ReactNode {
  return (
    <FieldGroup>
      <Field>
        <FieldLabel htmlFor={`person-${id}`}>Person {number}</FieldLabel>
        <InputGroup className="h-12">
          <InputGroupInput
            id={`person-${id}`}
            name="participantName"
            placeholder="Name"
            className="h-full px-4"
            required
            maxLength={MAX_PARTICIPANT_NAME}
          />
          {removable && (
            <InputGroupAddon align="inline-end" className="h-full py-0 pr-0 has-[>button]:mr-0">
              <InputGroupButton
                variant="secondary"
                size="icon-sm"
                className="h-full w-12 rounded-l-none border-l border-input"
                aria-label={`Remove person ${number}`}
                onClick={() => {
                  onRemove(id);
                }}
              >
                <XIcon />
              </InputGroupButton>
            </InputGroupAddon>
          )}
        </InputGroup>
      </Field>
      <LnurlField id={`person-${id}-lnurl`} name="participantLnurl" />
    </FieldGroup>
  );
}
