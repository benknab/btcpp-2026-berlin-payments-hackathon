import { NotesCard } from "@/components/notes-card";
import { getNotes } from "@/server/notes";
import { createFileRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";

export const Route = createFileRoute("/")({
  loader: (): ReturnType<typeof getNotes> => getNotes(),
  component: Home,
});

function Home(): ReactNode {
  const notes = Route.useLoaderData();

  return (
    <main className="mx-auto flex min-h-svh max-w-3xl flex-col gap-10 px-6 py-20">
      <header className="flex flex-col gap-4">
        <p className="text-sm font-medium tracking-widest text-muted-foreground uppercase">BTC++ · Berlin · 2026</p>
        <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
          Build something worth paying for.
        </h1>
        <p className="text-muted-foreground">TanStack Start + Effect + Drizzle + SQLite/libSQL, powered by Vite+.</p>
      </header>
      <NotesCard notes={notes} />
    </main>
  );
}
