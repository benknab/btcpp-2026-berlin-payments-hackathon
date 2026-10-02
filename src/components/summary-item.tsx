import type { ReactNode } from "react";

interface SummaryItemProps {
  readonly label: ReactNode;
  readonly children: ReactNode;
  readonly className?: string;
  readonly labelClassName?: string;
}

export function SummaryItem({ label, children, className, labelClassName }: SummaryItemProps): ReactNode {
  return (
    <div className={className}>
      <dt className={labelClassName}>{label}</dt>
      <dd className="tabular-nums">{children}</dd>
    </div>
  );
}
