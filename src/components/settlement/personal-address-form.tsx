import { ActionError } from "@/components/action-error";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useAction } from "@/components/use-action";
import { isSignetAddress } from "@/lib/pot";
import { setPersonalAddress } from "@/server/participant-payments";
import { useRouter } from "@tanstack/react-router";
import { useState } from "react";
import type { ReactNode } from "react";

export function PersonalAddressForm({
  personalKey,
  name,
  arkAddress,
  locked,
}: Readonly<{
  personalKey: string;
  name: string;
  arkAddress: string | null;
  locked: boolean;
}>): ReactNode {
  const [address, setAddress] = useState(arkAddress ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const action = useAction();
  const router = useRouter();
  const invalid = address.length > 0 && !isSignetAddress(address.trim());
  function submit(event: { readonly preventDefault: () => void }): void {
    event.preventDefault();
    action.run(async (): Promise<void> => {
      setMessage(null);
      setSaved(false);
      const result = await setPersonalAddress({ data: { accessKey: personalKey, arkAddress: address.trim() } });
      if (result.ok) {
        setSaved(true);
      } else {
        setMessage(result.message);
      }
      await router.invalidate();
    }, "Could not save your address. Refresh to check whether it was saved.");
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>{name}’s personal payout address</CardTitle>
        <CardDescription>
          Only signet sats. Use your own wallet’s receive address, never the pot address.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <form onSubmit={submit} className="flex flex-col gap-4">
          <FieldGroup>
            <Field data-invalid={invalid} data-disabled={locked}>
              <FieldLabel htmlFor="personal-ark-address">Your Bark signet address</FieldLabel>
              <Input
                id="personal-ark-address"
                value={address}
                onChange={(event) => {
                  setAddress(event.target.value);
                  setSaved(false);
                }}
                placeholder="tark1…"
                required
                spellCheck={false}
                autoComplete="off"
                aria-invalid={invalid}
                disabled={locked || action.pending}
              />
              <FieldDescription>
                {locked
                  ? "Settlement has started. This destination is now locked."
                  : "Run bark address in your personal signet wallet, then paste the result. Check it carefully before saving."}
              </FieldDescription>
              {invalid ? <FieldError>Enter a Bark signet address beginning with tark1.</FieldError> : null}
            </Field>
          </FieldGroup>
          {locked ? null : (
            <Button type="submit" disabled={action.pending || invalid || address.trim().length === 0}>
              {action.pending ? "Saving…" : "Save my address"}
            </Button>
          )}
        </form>
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {saved
            ? "Your address is saved. Tell the organizer you’re ready."
            : "Keep this private link to update your address before the group closes. Anyone holding it can act as you."}
        </p>
        <ActionError message={message ?? action.error} />
      </CardContent>
    </Card>
  );
}
