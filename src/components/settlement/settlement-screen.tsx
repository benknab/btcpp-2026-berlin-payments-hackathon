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
          payout or automatic retry of uncertain payments. No access code is required; keep this test app local.
        </AlertDescription>
      </Alert>
      {controller.error === null ? null : (
        <Alert variant="destructive">
          <AlertTitle>Settlement needs attention</AlertTitle>
          <AlertDescription>{controller.error}</AlertDescription>
        </Alert>
      )}
      {controller.error !== null && controller.pot === null ? (
        <Button type="button" variant="outline" disabled={pending} onClick={controller.handleOpen}>
          Retry loading saved pot
        </Button>
      ) : null}
      {controller.pot === null ? <SettlementSetupForm pending={pending} onCreate={controller.handleCreate} /> : null}
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
