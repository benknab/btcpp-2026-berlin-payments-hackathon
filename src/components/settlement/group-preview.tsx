import { SectionCard } from "@/components/section-card";
import type { GroupSettlementPreview } from "@/db/group-settlement-preview";
import { formatSats } from "@/domain/money";
import type { ReactNode } from "react";

export function GroupSettlementPreviewCard({ preview }: Readonly<{ preview: GroupSettlementPreview }>): ReactNode {
  return (
    <SectionCard title={`Settlement preview · ${formatSats(preview.totalSat)}`} contentClassName="flex flex-col gap-4">
      {preview.snapshot.users.map((person) => {
        const amount = preview.balances.find((balance) => balance.participantId === person.id)?.expenseBalanceSats ?? 0;
        return (
          <section key={person.id} className="flex flex-col gap-1">
            <p className="text-sm font-medium">
              {person.name}:{" "}
              {amount === 0 ? "0 sats" : `${amount > 0 ? "receives" : "pays"} ${formatSats(Math.abs(amount))}`}
            </p>
            <p className="text-xs break-all text-muted-foreground">
              {person.arkAddress ?? "Personal Bark address required"}
            </p>
          </section>
        );
      })}
    </SectionCard>
  );
}
