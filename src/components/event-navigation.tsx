import { buttonVariants } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { ArrowRightLeftIcon, LayoutDashboardIcon, ReceiptTextIcon } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";

const activeProps = {
  "className": buttonVariants({ variant: "secondary", className: "px-2 sm:px-4" }),
  "aria-current": "page",
} satisfies ComponentProps<"a">;
const inactiveProps = { className: buttonVariants({ variant: "ghost", className: "px-2 sm:px-4" }) };

export function EventNavigation({ inviteKey }: { readonly inviteKey: string }): ReactNode {
  return (
    <nav aria-label="Event" className="grid max-w-md grid-cols-3 gap-1 sm:flex">
      <Link
        to="/groups/$inviteKey"
        params={{ inviteKey }}
        activeOptions={{ exact: true }}
        activeProps={activeProps}
        inactiveProps={inactiveProps}
      >
        <LayoutDashboardIcon data-icon="inline-start" className="hidden sm:block" aria-hidden="true" />
        Overview
      </Link>
      <Link
        to="/groups/$inviteKey/expenses"
        params={{ inviteKey }}
        activeProps={activeProps}
        inactiveProps={inactiveProps}
      >
        <ReceiptTextIcon data-icon="inline-start" className="hidden sm:block" aria-hidden="true" />
        Expenses
      </Link>
      <Link
        to="/groups/$inviteKey/settlement"
        params={{ inviteKey }}
        activeProps={activeProps}
        inactiveProps={inactiveProps}
      >
        <ArrowRightLeftIcon data-icon="inline-start" className="hidden sm:block" aria-hidden="true" />
        Settle up
      </Link>
    </nav>
  );
}
