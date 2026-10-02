import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import type { ReactNode } from "react";

export const Route = createFileRoute("/settle")({ component: SettlementPage });

function SettlementPage(): ReactNode {
  return (
    <main className="mx-auto flex min-h-svh max-w-4xl flex-col gap-8 px-6 py-12">
      <header className="flex flex-col gap-4">
        <Link to="/" className={buttonVariants({ variant: "ghost", size: "sm", className: "self-start" })}>
          Back to home
        </Link>
        <p className="text-sm font-medium tracking-widest text-muted-foreground uppercase">Bark signet</p>
        <h1 className="text-4xl font-semibold tracking-tight text-balance">Settlement pots</h1>
        <p className="text-muted-foreground">
          Agree who owes whom. Collect everyone’s contribution. Pay out once the pot is full.
        </p>
      </header>
      <Alert>
        <AlertTitle>Signet test funds only</AlertTitle>
        <AlertDescription>
          Local testing only. Payments require confirmed deposits and an explicit payout review. No automatic payouts.
        </AlertDescription>
      </Alert>
      <Outlet />
    </main>
  );
}
