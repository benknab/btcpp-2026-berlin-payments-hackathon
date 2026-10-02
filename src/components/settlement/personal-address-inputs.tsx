import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import type { ReactNode } from "react";

import { PersonalAddressField } from "./personal-address-field";
import type { usePersonalAddress } from "./use-personal-address";

export function PersonalAddressInputs({
  action,
  invalid,
  locked,
}: {
  readonly action: ReturnType<typeof usePersonalAddress>;
  readonly invalid: boolean;
  readonly locked: boolean;
}): ReactNode {
  return (
    <FieldGroup>
      <PersonalAddressField
        address={action.address}
        invalid={invalid}
        disabled={locked || action.pending}
        onChange={action.handleChange}
      />
      {!locked && (
        <Button type="submit" disabled={action.pending || invalid || action.address.trim().length === 0}>
          {action.pending ? "Saving…" : "Save my address"}
        </Button>
      )}
    </FieldGroup>
  );
}
