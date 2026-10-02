import { PotDetails } from "@/components/settlement/pot-details";
import { PotView } from "@/components/settlement/pot-view";
import { SettlementSetupForm } from "@/components/settlement/setup-form";
import { useSettlement } from "@/components/settlement/use-settlement";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { SettlementDocument } from "@/lib/settlement";
import type { ReactNode } from "react";

export function SettlementScreen({ initialPot }: Readonly<{ initialPot: SettlementDocument }>): ReactNode {
  const controller = useSettlement(initialPot);
  const pending = controller.pending !== null;
  const { pot } = controller;
  return (
    <div className="flex flex-col gap-6" aria-busy={pending}>
      <div className="flex items-center gap-3">
        <h2 className="text-2xl font-semibold">Pot #{pot.id}</h2>
        <Badge variant={pot.status === "settled" ? "default" : "secondary"}>
          {pot.status === "settled" ? "Settled" : "Unsettled"}
        </Badge>
      </div>
      {controller.error === null ? null : (
        <Alert variant="destructive">
          <AlertTitle>Pot needs attention</AlertTitle>
          <AlertDescription>{controller.error}</AlertDescription>
        </Alert>
      )}
      {pot.locked ? (
        <PotDetails pot={pot} />
      ) : (
        <SettlementSetupForm pending={pending} onCreate={controller.handleSave} />
      )}
      {pot.locked && pot.execution === null ? (
        <div className="flex flex-wrap gap-3">
          <Button type="button" disabled={pending} onClick={controller.handlePrepare}>
            {controller.pending === "prepare" ? "Preparing deposits…" : "Prepare deposits"}
          </Button>
          <Button type="button" variant="outline" disabled={pending} onClick={controller.handleReload}>
            Reload pot
          </Button>
        </div>
      ) : null}
      {!pot.locked && controller.error !== null ? (
        <Button type="button" variant="outline" disabled={pending} onClick={controller.handleReload}>
          Reload pot
        </Button>
      ) : null}
      {pot.execution === null ? null : (
        <PotView
          pot={pot.execution}
          pending={pending}
          needsRefresh={controller.needsRefresh}
          onRefresh={controller.handleRefresh}
          onPay={controller.handlePay}
        />
      )}
    </div>
  );
}
