import { ActionError } from "@/components/action-error";
import { SectionCard } from "@/components/section-card";
import { isSignetAddress } from "@/lib/pot";
import type { ReactNode } from "react";

import { PersonalAddressInputs } from "./personal-address-inputs";
import { usePersonalAddress } from "./use-personal-address";

export function PersonalAddressForm({
  personalKey,
  name,
  arkAddress,
  locked,
}: Readonly<{ personalKey: string; name: string; arkAddress: string | null; locked: boolean }>): ReactNode {
  const action = usePersonalAddress(personalKey, arkAddress);
  const invalid = action.address.length > 0 && !isSignetAddress(action.address.trim());
  const editableStatus = action.saved ? "Address saved." : "Keep this link private. It allows changes to your address.";
  return (
    <SectionCard title={`${name}’s personal payout address`} contentClassName="flex flex-col gap-4">
      <form onSubmit={action.handleSubmit}>
        <PersonalAddressInputs action={action} invalid={invalid} locked={locked} />
      </form>
      <p className="text-sm text-muted-foreground" aria-live="polite">
        {locked ? "Address locked." : editableStatus}
      </p>
      <ActionError message={action.error} />
    </SectionCard>
  );
}
