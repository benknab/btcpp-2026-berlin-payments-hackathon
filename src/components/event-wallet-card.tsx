import { formatSats } from "@/domain/money";
import type { ReactNode } from "react";

import { ActionError } from "./action-error";
import { SectionCard } from "./section-card";
import { Button } from "./ui/button";
import { useWalletBalance } from "./use-wallet-balance";

interface EventWalletCardProps {
  readonly arkAddress: string;
  readonly isOrganizer: boolean;
}

export function EventWalletCard({ arkAddress, isOrganizer }: EventWalletCardProps): ReactNode {
  const wallet = useWalletBalance(arkAddress);
  return (
    <SectionCard title="Event wallet · signet" contentClassName="flex flex-col gap-3">
      <code className="text-xs break-all">{arkAddress}</code>
      {isOrganizer && (
        <Button
          variant="outline"
          disabled={wallet.pending}
          onClick={() => {
            wallet.sync();
          }}
        >
          {wallet.pending ? "Syncing…" : "Sync wallet"}
        </Button>
      )}
      {wallet.balance !== null && <p>Available: {formatSats(wallet.balance.spendableSats)}</p>}
      {wallet.balance?.nextRefreshHeight !== null && wallet.balance !== null && (
        <p className="text-sm text-muted-foreground">Refresh by block {wallet.balance.nextRefreshHeight}.</p>
      )}
      <ActionError message={wallet.error} />
    </SectionCard>
  );
}
