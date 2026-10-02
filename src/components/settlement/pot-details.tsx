import { SectionCard } from "@/components/section-card";
import { PotDebtsTable } from "@/components/settlement/pot-debts-table";
import { PotUsersTable } from "@/components/settlement/pot-users-table";
import type { SettlementDocument } from "@/lib/settlement";
import type { ReactNode } from "react";

export function PotDetails({ pot }: Readonly<{ pot: SettlementDocument }>): ReactNode {
  return (
    <SectionCard
      title="Users and debts"
      description={`Saved in pot #${pot.id}. These details are locked for settlement.`}
      contentClassName="flex flex-col gap-6"
      footer={
        <p className="text-sm text-muted-foreground">
          Wallets, deposit receipts, and payouts are managed by the backend.
        </p>
      }
    >
      <PotUsersTable users={pot.users} />
      <PotDebtsTable pot={pot} />
    </SectionCard>
  );
}
