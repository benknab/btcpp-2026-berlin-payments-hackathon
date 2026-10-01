import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import type { ReactNode, SubmitEvent } from "react";

interface AccessProps {
  readonly accessCode: string;
  readonly pending: boolean;
  readonly onChange: (value: string) => void;
  readonly onOpen: () => void;
}

export function SettlementAccessForm({ accessCode, pending, onChange, onOpen }: AccessProps): ReactNode {
  function submit(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault();
    onOpen();
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>Connect to the settlement wallet</CardTitle>
        <CardDescription>Only the pot operator can create a settlement or release its funds.</CardDescription>
      </CardHeader>
      <CardContent>
        <form id="settlement-access" onSubmit={submit}>
          <FieldGroup>
            <Field data-disabled={pending}>
              <FieldLabel htmlFor="settlement-code">Operator access code</FieldLabel>
              <Input
                id="settlement-code"
                type="password"
                autoComplete="current-password"
                required
                disabled={pending}
                value={accessCode}
                onChange={(event): void => {
                  onChange(event.target.value);
                }}
              />
              <FieldDescription>
                Use the server’s POT_UI_ACCESS_CODE, not a Bark token or recovery phrase. Reconnect after a reload to
                resume your saved pot.
              </FieldDescription>
            </Field>
          </FieldGroup>
        </form>
      </CardContent>
      <CardFooter>
        <Button type="submit" form="settlement-access" disabled={pending || accessCode.length === 0}>
          {pending ? <Spinner data-icon="inline-start" /> : null}
          {pending ? "Connecting…" : "Connect / resume pot"}
        </Button>
      </CardFooter>
    </Card>
  );
}
