# Development

Use pnpm for dependencies and Vite+ for builds, formatting, linting, and tests.
See [local setup](../README.md#run-locally) and [project conventions](../AGENTS.md).

```sh
pnpm check       # Formatting, type-aware linting, and TSGo
pnpm test        # Backend and domain tests
pnpm build      # Client and server bundles
pnpm fmt        # Format and sort imports
pnpm typecheck  # TSGo
```

## Database

Local development uses SQLite at `DATABASE_URL=file:mainnet.db`.
For remote libSQL, set `DATABASE_URL` and `DATABASE_AUTH_TOKEN` in `.env`; keep credentials server-only.
After changing `src/db/schema.ts`, run `pnpm db:generate`, review the generated migration, and run `pnpm db:migrate`.
Commit generated migrations. `pnpm db:studio` opens the database browser.

### Reset a disposable development database

The integrated migration baseline replaces earlier development migrations. An older local database may need a
one-time reset. Stop the app first:

```sh
pnpm db:reset
pnpm dev
```

`db:reset` loads `.env`, deletes the configured local SQLite database and sidecars, and reapplies migrations.
**This deletes all event, expense, and payment records.** Browser storage and Bark wallet directories are separate
and are not reset. Never reset a deployed database or a database needed to reconcile funded events.
