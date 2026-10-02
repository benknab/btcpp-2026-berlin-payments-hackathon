import { useId } from "react";
import type { ReactNode } from "react";

import { ActionError } from "./action-error";
import { LabeledField } from "./labeled-field";
import { Button } from "./ui/button";
import { FieldGroup } from "./ui/field";
import { Textarea } from "./ui/textarea";

export function RecoveryPhraseForm(props: {
  readonly backup: boolean;
  readonly phrase: string;
  readonly pending: boolean;
  readonly error: string | null;
  readonly onChange: (phrase: string) => void;
  readonly onRestore: () => void;
}): ReactNode {
  const inputId = useId();
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (!props.backup) {
          props.onRestore();
        }
      }}
    >
      <FieldGroup className="gap-3">
        <LabeledField id={inputId} label="Recovery phrase" disabled={props.pending}>
          <Textarea
            id={inputId}
            value={props.phrase}
            readOnly={props.backup}
            disabled={props.pending}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            rows={4}
            onChange={(event) => {
              props.onChange(event.target.value);
            }}
          />
        </LabeledField>
        <ActionError message={props.error} />
        {!props.backup && (
          <Button type="submit" disabled={props.pending || props.phrase.trim() === ""}>
            {props.pending ? "Restoring…" : "Restore wallet"}
          </Button>
        )}
      </FieldGroup>
    </form>
  );
}
