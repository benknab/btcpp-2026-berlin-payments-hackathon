import { SettlementAccessForm } from "@/components/settlement/access-form";
import { PotView } from "@/components/settlement/pot-view";
import { SettlementSetupForm } from "@/components/settlement/setup-form";
import { useSettlement } from "@/components/settlement/use-settlement";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { ReactNode } from "react";

export function SettlementScreen(): ReactNode {
  const controller = useSettlement();
  const pending = controller.pending !== null;
  return (
    <div className="flex flex-col gap-6" aria-busy={pending}>
      <Alert>
        <AlertTitle>Signet test funds only</AlertTitle>
        <AlertDescription>
          This is the final settlement step, not trustless escrow. It moves real signet sats. There is no automatic
          payout or automatic retry of uncertain payments.
        </AlertDescription>
      </Alert>
      {controller.error === null ? null : (
        <Alert variant="destructive">
          <AlertTitle>Settlement needs attention</AlertTitle>
          <AlertDescription>{controller.error}</AlertDescription>
        </Alert>
      )}
      {controller.connected ? (
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">Operator connected · dedicated pot wallet</p>
          <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={controller.handleDisconnect}>
            Disconnect
          </Button>
        </div>
      ) : (
        <SettlementAccessForm
          accessCode={controller.accessCode}
          pending={pending}
          onChange={controller.handleAccessCodeChange}
          onOpen={controller.handleOpen}
        />
      )}
      {controller.connected && controller.pot === null ? (
        <SettlementSetupForm pending={pending} onCreate={controller.handleCreate} />
      ) : null}
      {controller.pot === null ? null : (
        <PotView
          pot={controller.pot}
          pending={pending}
          needsRefresh={controller.needsRefresh}
          onRefresh={controller.handleRefresh}
          onPay={controller.handlePay}
        />
      )}
    </div>
  );
}
