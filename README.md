# BTC++ 2026 Berlin Payments Hackathon

A hackathon project for **BTC++ 2026 in Berlin**, exploring shared expenses and real money settlement using **Bark**.

## Project idea

We're aiming to build a **Splitwise / Kittysplit-style app** that doesn't stop at calculating who owes whom.
Participants share a pot, track expenses, and settle the final balances with actual money from that pot using Bark.

### V1: shared-pot settlement

- Create a group and a shared pot.
- Let participants contribute money and record shared expenses.
- Calculate each participant's final balance.
- At the end, settle what everyone is owed from the pot using Bark.

V1 will focus on getting this end-to-end flow working. More advanced features and improvements will follow later.

**Current status:** the application scaffold and database-backed demo are working. Expense splitting, pot management,
Bark integration, and real settlement are planned work, not implemented yet.

## Stack

TanStack Start + React, Vite+, Effect 4, Drizzle, SQLite/libSQL, Tailwind CSS 4, and shadcn/ui (Base UI, Nova),
with Bark planned for the payment and settlement layer.

## Start

Use Node 22.23.1 (or a supported newer version) and pnpm 12.8.1.

```sh
pnpm install
cp .env.example .env
pnpm db:migrate
pnpm dev
```

Open <http://localhost:5173>. The example note feature validates input with Effect Schema and runs Drizzle queries as
native Effects. SQLite works locally without a separate database server. Server functions keep database code and
credentials out of the browser bundle.

## Database

- Local SQLite: `DATABASE_URL=file:local.db` (the default, even without `.env`).
- Remote libSQL / Turso: set `DATABASE_URL=libsql://your-database.turso.io` and `DATABASE_AUTH_TOKEN` in `.env`.
- Both Drizzle Kit and the server read `.env`; never prefix database credentials with `VITE_`.
- After editing `src/db/schema.ts`, run `pnpm db:generate`, review the SQL, and run `pnpm db:migrate`.
- `pnpm db:studio` opens the database browser. `pnpm db:push` is available for disposable development databases;
  use migrations for shared/production databases.

Drizzle ORM and Kit are pinned together at **1.0.0-rc.5-5935859**, the newer RC5 build compatible with stable
**Effect 4.0.0** and **@effect/sql-libsql 4.0.0**. An integration test applies real migrations and writes/reads SQLite
through `drizzle-orm/effect-libsql`.

## Commands

```sh
pnpm check       # Oxfmt + type-aware Oxlint + TSGo
pnpm typecheck   # TSGo, not tsc
pnpm fmt         # Format, sort imports, sort Tailwind utilities
pnpm lint        # Type-aware lint and type checks
pnpm test        # Run tests once
pnpm test:watch  # Watch tests
pnpm build       # Build client and SSR bundles
```

You can also run `pnpm exec vp dev`, `pnpm exec vp check`, or `pnpm exec vp run <task>` directly. The production build
emits `dist/client` and `dist/server`; choose a TanStack Start hosting adapter for your deployment target.

## Strictness

- TypeScript enables `strict`, exact optional properties, checked indexed access, checked override declarations,
  unused/unreachable checks, isolated modules, erasable syntax, verbatim modules, and checked side-effect imports.
- `skipLibCheck` is the sole dependency exception: upstream declarations refer to optional Babel/bundler/database
  packages that this application does not use. Application code and usages of dependency APIs are still checked.
- All Oxlint categories are errors, with documented exceptions for mutually exclusive rules and modern
  React/Effect/shadcn APIs. Unsafe `any` operations, non-null assertions, unhandled promises, and non-exhaustive
  switches remain errors. Generated routes and migrations are not hand-linted.
- Default size/complexity limits are advisory warnings, with scoped test overrides. See `AGENTS.md`.
- Oxfmt enforces 120 columns, double quotes, semicolons, LF, import sorting, and Tailwind sorting.

Vite is aliased to Vite+'s bundled core so TanStack plugins and the CLI share a single Vite instance. The alias package
reports version 1.0.0 but contains Vite 8.3.1; pnpm's matching peer-version allowance is intentional.

## UI

Use Tailwind utilities, not custom CSS classes. Use the installed shadcn components and semantic theme colors.
The official shadcn skill is installed in `.agents/skills/shadcn`; `AGENTS.md` describes the required workflow.

```sh
pnpm exec shadcn docs dialog
pnpm exec shadcn add @shadcn/dialog
```

The global stylesheet contains only Tailwind/shadcn imports, theme variables, and the standard base layer.
