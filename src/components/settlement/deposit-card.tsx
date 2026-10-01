import { CopyAddress } from "@/components/settlement/copy-address";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { PotParticipant } from "@/lib/pot";
import type { ReactNode } from "react";

export function DepositCard({ participant }: Readonly<{ participant: PotParticipant }>): ReactNode {
  const paid = participant.receivedSat >= participant.payInSat;
  const remaining = Math.max(0, participant.payInSat - participant.receivedSat);
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>
          {participant.name} pays {participant.payInSat.toLocaleString()} sats
        </CardTitle>
        <CardDescription>
          {participant.receivedSat.toLocaleString()} sats confirmed · {remaining.toLocaleString()} sats remaining
        </CardDescription>
        <CardAction>
          <Badge variant={paid ? "default" : "outline"}>{paid ? "Paid in full" : "Awaiting deposit"}</Badge>
        </CardAction>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor={`deposit-${participant.userId}`}>
              Pot deposit address for {participant.name}
            </FieldLabel>
            <Input
              id={`deposit-${participant.userId}`}
              value={participant.depositAddress}
              readOnly
              spellCheck={false}
            />
            <FieldDescription>
              Send only signet Ark sats to this address, not to a participant’s payout address. Click “Check deposits”
              after paying.
            </FieldDescription>
          </Field>
        </FieldGroup>
      </CardContent>
      <CardFooter>
        <CopyAddress address={participant.depositAddress} />
      </CardFooter>
    </Card>
  );
}
