import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { SearchIcon } from "lucide-react";
import type { ReactNode } from "react";

export function ExpenseSearch({
  query,
  onChange,
}: {
  readonly query: string;
  readonly onChange: (value: string) => void;
}): ReactNode {
  return (
    <FieldGroup>
      <Field>
        <FieldLabel htmlFor="expense-search" className="sr-only">
          Search expenses
        </FieldLabel>
        <InputGroup>
          <InputGroupInput
            id="expense-search"
            type="search"
            placeholder="Search expenses"
            value={query}
            onChange={(event) => {
              onChange(event.target.value);
            }}
          />
          <InputGroupAddon>
            <SearchIcon aria-hidden="true" />
          </InputGroupAddon>
        </InputGroup>
      </Field>
    </FieldGroup>
  );
}
