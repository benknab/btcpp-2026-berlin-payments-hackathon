# BTC++ 2026 Berlin Payments Hackathon

A hackathon project for **BTC++ 2026 in Berlin**, exploring shared expenses and real money settlement using **Bark**.

## Project idea

We're aiming to build a **Splitwise / Kittysplit-style app** that doesn't stop at calculating who owes whom.
Participants track expenses, then fund an owner-controlled pot to settle their final net balances using Bark.

### V1 scope: owner-controlled settlement pot

1. **Owner creates the event and pot wallet.**
   - A valid owner receiving destination is required at creation.
   - Create a dedicated Bark wallet in the owner's browser using `@secondts/bark/web`.
   - Store its public Ark address on the backend; the owner's wallet keys stay in the browser.
   - Back up the mnemonic and wallet data, keeping the data backup current as the wallet changes.
2. **Friends join.**
   - Invitees open the invitation, select their name, and save their own receiving destination before continuing.
     The owner no longer fills in guests' destinations. Owner destination changes require the organizer cookie;
     guest changes must match the selected participant cookie. Name selection is not authenticated identity.
   - Supported payout destinations: Lightning addresses/LNURL-pay, Bark mainnet Ark addresses (`ark1…`), and
     BOLT12 offers (`lno1…`). Participants may share receiving destinations, and withdrawals may reuse them.
     Nostr profile lookup is not supported.
3. **Record expenses and lock settlement.**
   - Calculate each participant's net contribution or payout, then freeze amounts and payout destinations.
   - Debtors fund only their net obligation; creditors receive only their net entitlement.
   - Include the owner's own debtor or creditor position. For V1, the owner covers fees with a separate reserve.
4. **Participants pay their shares.**
   - A participant opens the group, selects **Pay Bob's share**, and sees a Lightning invoice and QR code.
     Anyone can pay that obligation; selecting Bob does not establish the payer's identity.
   - The backend's dedicated Barkd receiving wallet calls
     `POST /api/v1/lightning/receives/invoice/for-address`, targeting the owner's stored Ark address.
   - Barkd claims the incoming Lightning payment and delivers the sats to the owner's Ark address mailbox.
     The owner's browser can be closed; backend Barkd stays running to process receipts and delivery.
   - Persist each invoice/payment hash against its settlement and participant obligation. Reuse an existing
     unexpired invoice when reopening the payment page and retain older attempts for reconciliation.
   - Track **pending → paid → delivered to pot**, with explicit expired/failed outcomes. Credit actual delivered
     amounts and account for duplicate or excess contributions separately.
5. **Owner redistributes the pot.**
   - The owner opens and unlocks their browser wallet, syncs it, and reviews the payout amounts and destinations.
   - Start redistribution after all required contributions and an owner fee-reserve invoice are delivered, and
     spendable funds cover payouts and current estimated fees. On the event overview, **Owner fee reserve → Estimate fees / deposit**
     estimates remaining payout fees using the browser wallet and creates an invoice for the shortfall.
   - Resolve LNURL-pay invoices, send directly to Ark addresses, or pay BOLT12 offers for the exact settlement amount.
     The owner approves, and their browser wallet executes the payments.
   - Persist each attempt before sending and confirm each payout individually. Reconcile interrupted or unknown
     outcomes before retrying; payouts are sequential, not an atomic batch.
   - Fee-reserve receipts are separate from expense contributions and never create excess participant debt payments.
     Account for the owner's entitlement, excess contributions, and leftover fees. Mark the group settled only when
     all entitlements are accounted for.

**Trust model:** friends trust the owner with the pot. Our backend is trusted to deliver incoming contributions;
it can redirect those contributions, but holds no owner-wallet keys and has no direct spending authority over funds
already delivered to the owner. The browser wallet still trusts the JavaScript served by the app.

**Wallet lifecycle:** receiving while the owner is offline does not mean funds can be left unattended indefinitely.
Track VTXO expiries and implement refresh/reconnection handling alongside ongoing backups. See Bark's
[browser SDK](https://second.tech/docs/bark-sdk/wasm),
[receive-for-address API](https://second.tech/docs/barkd/api-reference/lightning/create-a-bolt11-invoice-for-an-ark-address),
and [VTXO lifetime documentation](https://second.tech/docs/learn/lifetime).

**Current integration milestone:** verify a small mainnet round trip: contribution invoice → owner browser closed →
delivery → owner reopens → Lightning-address/LNURL payout. Start with a 1,000-sat obligation plus a separate fee reserve.
See [the mainnet browser-pot setup and demo](dev/bark/BROWSER.md). `pnpm dev` starts or reuses the local receiving Barkd
and passes its credentials to Vite server-side. Barkd stays running after Vite exits to finish offline delivery.

**Current status:** event creation, invitations, expense management, and personal balance overviews are implemented.
The event overview shows the organizer's **Owner fee reserve** first, followed by total spent and a compact
remaining-payout tally. The organizer can deposit a chosen reserve amount immediately after creating an event;
**Check deposit** reconciles its receipt without locking expenses. Exact fee estimation becomes available after
settlement is locked, using the same reserve and topping up any shortfall. Deposits do not count as expense payments.
**View expenses** opens the searchable
expense list; **View settlement** opens detailed balances, receiving addresses, funding/payout controls, and the event wallet.
Add/edit expenses support equal splits (everyone or selected people), exact sats, weighted shares, and percentages.
Weights and percentages support two decimal places; percentages must total 100 and exact amounts must match the total.
Proportional splits allocate whole sats by largest remainder, with participant IDs breaking ties. Split settings persist
on edit. Run `pnpm db:migrate` for the additive split-settings migration; existing equal splits remain valid.
The overview refreshes every 15 seconds while visible, and confirmed settlement payments reduce remaining balances.
Event creation generates a dedicated mainnet wallet using `@secondts/bark/web` and saves its public address in
`groups.ark_address`. Events can lock net obligations and collect Lightning contributions through a persistent
Barkd receiving wallet, including while the organizer's browser is closed. See [browser pot setup](dev/bark/BROWSER.md).
The owner can pay creditors from the browser wallet, with persisted attempts and payment-proof verification.
The earlier signet round trip was manually verified with a prepared BOLT11 payout invoice; mainnet LNURL settlement
still needs a funded rehearsal with a receiving service that supports browser CORS.

Event payouts also support Bark mainnet Ark addresses on the same Ark server and compatible mainnet BOLT12 offers.
Run `pnpm db:migrate` to apply the additive payout-method migration; no database reset is needed. Receiving-address
fields auto-detect the method, including during event creation. Participants can update their own destination until
their payout starts; saving a replacement expires prepared, unsent attempts without changing net obligations.
Ark/BOLT12 intents and the wallet-history boundary are persisted before sending. Interrupted attempts reconcile
against matching wallet movements and are never automatically resent. Lightning payouts require a matching preimage;
Ark receipts and the binding of BOLT12 payment hashes to offers/amounts rely on organizer-attested browser history,
not independent backend verification. The legacy `lnurl` field stores all receiving destination types; the payout
`paymentHash` coordination key is a random intent ID for Ark/BOLT12, with actual Lightning hashes stored separately.
Live mainnet Ark/BOLT12 payouts still need rehearsal; local backend tests cover preparation, authorization, amount and
destination matching, proof checks, and interrupted-attempt reconciliation.

Run `pnpm db:migrate` for the additive `event_invoices.purpose` migration; existing invoices remain expense
contributions and events are preserved. New owner top-up invoices are persisted as fee reserves and reused while
pending. Historical top-ups and direct Ark transfers cannot be attributed retroactively as owner deposits. The
reserve requirement applies before new payouts, not before reconciling an already-started payment. Zero estimated
fees require no reserve. Leftover reserves remain withdrawable after settlement; a deposit does not guarantee
receiver availability or resolve uncertain payment outcomes.

Events use only browser-owned wallet settlement. Managed event settlement and private participant links have been
removed, including their server endpoints and database tables. Run `pnpm db:migrate` to drop `group_settlements` and
`participant_payments`. Existing managed settlements are not supported or converted; use new events for the browser flow.

The older standalone `/settle` workspace, server-owned pot wallet engine, test-address generator, and `pot:demo`
command are also removed. Docker serves events and invitations without a shared Basic login; organizer and participant
cookie checks and cross-origin action protection remain. Legacy standalone table definitions, database records, and
wallet directories are retained for recovery, with no application actions that read or spend from them. This cleanup
requires no migration or database reset. Owner recovery remains self-declared as described below; use only small amounts
with trusted participants, and keep invitation links private.

### Browser event wallets

- Use HTTPS or localhost. The SDK loads lazily when creating an event; it does not execute during SSR.
- Each event has its own IndexedDB wallet (`bark-mainnet-event-<uuid>`). Its mnemonic and public address are kept in this
  browser's localStorage under `bark:mainnet:event-wallet:<uuid>`. Only the public address is sent to the backend.
- Wallet creation and local persistence must succeed before the event is saved. Retrying within the form reuses
  the wallet. Existing events retain a nullable address; no replacement wallet is generated for them.
- Browser storage is currently unencrypted. Owners can select **Recovery phrase** in **Event wallet · mainnet** on the
  **View settlement** page to record their mnemonic. After clearing site data or switching browsers, open the same event
  link, select your name, open **View settlement**, select **I'm the owner** in the wallet section, and enter that event
  wallet's phrase. An owner whose cookie remains but wallet storage is missing can use **Recovery phrase**
  to open the restore form. The phrase stays in the browser and is never sent to our backend.
- Mnemonic recovery uses the Ark server's recovery mailbox and requires that server's cooperation. It restores
  spendable Ark funds, not payment history or in-progress exits. Failed or incomplete recovery does not grant owner access.
  Full wallet-data backups remain outstanding. Do not retry uncertain payouts just because a restored wallet lacks history.
- Owner-cookie recovery is deliberately self-declared: the backend accepts the event link without a wallet-ownership
  proof, issues a new owner cookie, and invalidates earlier owner cookies. Anyone with the link can claim app owner
  permissions, but spending the original wallet still requires its keys. No address-to-phrase ownership check is performed;
  enter the correct event phrase. This is a trusted, small-amount prototype, not production authentication.
- The pinned `@secondts/bark@0.25.0` uses `Wallet.open("Bitcoin", mnemonic, config, undefined, args)` with
  `createIfNotExists`; its published types supersede older named-argument examples in the web guide.

See [the Person A / Person B implementation plan](IMPLEMENTATION_PLAN.md) for the earlier work split and 23-hour delivery
schedule. The V1 scope above supersedes conflicting settlement assumptions in that plan.

## Inspiration

We draw on Zaplit / LNSplit's utility, Evento's social context, and Artmak's visual money movement:
practical Bitcoin expense splitting, payments grounded in shared experiences, and an intuitive view of money flowing.

- [Zaplit](https://github.com/lacrypta/zaplit): Split group expenses at events with Bitcoin Lightning payments via Nostr Wallet Connect.
- [LNSplit](https://github.com/tumabitcoiner/ln-split): Generate a BOLT11 invoice per person to split a bill using a Lightning address.
- [Evento](https://github.com/sevenlabsxyz/evento-client): Social-first event management with a built-in Bitcoin Lightning wallet powered by Breez SDK.
- [Artmak](https://github.com/sbddesign/artmak): An interactive Bitcoin Ark wallet where receiving and sending test coins changes your blob's size and speed.

## Stack

TanStack Start + React, Vite+, Effect 4, Drizzle, SQLite/libSQL, Tailwind CSS 4, and shadcn/ui (Base UI, Nova),
with Bark for payments. Events use `@secondts/bark/web` for the owner's browser wallet and server-side Barkd for
Lightning collection on the owner's behalf. Only the browser wallet executes event payouts.

## Payment diagnostics

Structured Effect logs cover event setup, contribution invoices/delivery, wallet sync, fee checks, LNURL resolution,
and payout authorization/confirmation. Server JSON logs persist under `~/.local/share/bark-payments-mainnet/logs/`.
See [payment diagnostics](dev/observability/README.md) for log commands and the local OpenTelemetry/Grafana viewer.

## Bark mainnet development wallet

The app uses `https://ark.second.tech` and `https://mempool.second.tech/api`. Mainnet data starts in `mainnet.db`,
separate browser storage, and mainnet-suffixed Bark wallet directories. Existing signet events and wallets are not
converted or deleted. Create new events for mainnet testing. Run `pnpm db:migrate` to initialize the fresh database;
no reset is required for this network switch. Update any existing `DATABASE_URL` override to `file:mainnet.db`.

### Reset the development database

The October 2 integration replaces the divergent migration histories with one generated baseline. Existing local
databases must be reset once after pulling this change. Stop the dev server, then run:

```sh
pnpm db:reset
pnpm dev
```

`db:reset` deletes the SQLite file configured by `DATABASE_URL` (default `file:mainnet.db`), its sidecar files, and
reapplies migrations. It loads `.env` and only accepts local `file:` databases. This removes all event, expense,
and settlement records. Bark wallet directories and browser storage are separate. This non-production project
permits database resets and baseline regeneration when migration reconciliation becomes costly.

### Install Bark and Barkd

Install **both tools at 0.7.1**; the pinned `@secondts/barkd@0.7.2` client targets this daemon API.
These commands use Second's official binary releases and install without sudo on macOS or Linux x86_64:

```sh
(
  set -eu
  case "$(uname -s)-$(uname -m)" in
    Darwin-arm64) platform=apple-aarch64 ;;
    Darwin-x86_64) platform=apple-x86_64 ;;
    Linux-x86_64) platform=linux-x86_64 ;;
    *) echo "See Second's install guides for this platform." >&2; exit 1 ;;
  esac

  mkdir -p "$HOME/.local/bin"
  for tool in bark barkd; do
    if [ -e "$HOME/.local/bin/$tool" ] || [ -L "$HOME/.local/bin/$tool" ]; then
      echo "Already installed: $HOME/.local/bin/$tool; check its version before replacing it." >&2
      exit 1
    fi
  done

  download_dir=$(mktemp -d "${TMPDIR:-/tmp}/bark-install.XXXXXX")
  for tool in bark barkd; do
    curl --fail --location --proto '=https' --tlsv1.2 \
      "https://gitlab.com/ark-bitcoin/bark/-/releases/bark-0.7.1/downloads/$tool-0.7.1-$platform" \
      --output "$download_dir/$tool"
    install -m 755 "$download_dir/$tool" "$HOME/.local/bin/$tool"
  done
)

export PATH="$HOME/.local/bin:$PATH"
bark --version
barkd --version
```

Add `export PATH="$HOME/.local/bin:$PATH"` to your shell configuration if needed, then restart the app so it
inherits that PATH. Both version commands should report **0.7.1**. For other platforms or source builds, see
Second's [Bark CLI](https://second.tech/docs/getting-started/bark-cli) and
[Barkd](https://second.tech/docs/barkd/install) installation guides.

### Create and fund a local wallet

Follow [the mainnet wallet setup](dev/bark/README.md) to create a fresh wallet and fund it over Lightning.
Installing the tools or cloning this repository does **not** restore the funded wallet on the remote environment.
An Ark address is only a receiving destination, not a wallet backup. The legacy recovery phrase in
`dev/bark/signet.mnemonic` is public and is not a complete backup of that wallet; never use it for mainnet.

Use [the browser-wallet demo](dev/bark/BROWSER.md) for the supported event settlement flow. The legacy
[server-owned pot demo](dev/bark/POTS.md) is retired; do not fund its old addresses.

### Event settlement demo

1. Create an event, save its **Recovery phrase** under **View settlement → Event wallet · mainnet**, and share the invitation.
2. Record expenses. In **View settlement**, save receiving addresses and select **Start settlement**.
3. Debtors select their share and pay the Lightning invoice. The receiver delivers funds while the owner is offline.
4. The owner selects **Sync wallet**, funds a separate fee reserve, and selects **Pay creditors / reconcile**.
5. After settlement, use **Withdraw max** for any remainder. Never resend an uncertain payment manually.

See [the browser-wallet demo](dev/bark/BROWSER.md) for setup and the full flow. Mnemonic recovery and self-declared owner
access are described above. Use small amounts with trusted participants; this is not production authentication.

## Start

Use Node 22.23.1 (or a supported newer version) and pnpm 12.8.1.

```sh
pnpm install
cp .env.example .env
pnpm db:migrate
pnpm dev
```

Open <http://localhost:3100> to create an event. Input is validated with Effect Schema and Drizzle queries run as
native Effects. SQLite works locally without a separate database server. Server functions keep database code and
credentials out of the browser bundle.

## Docker deployment

Run the production app and Barkd together, with automatic mainnet receiver creation, migrations, and private credentials:

```sh
docker compose up --detach --build --wait --wait-timeout 180
```

Open <http://localhost:3100>; events and invitations do not require a shared login. No manual Bark `.env` setup is required.
The persistent volume contains the full receiver wallet data and application database; never delete it.
See [deployment instructions](deploy/README.md) for HTTPS, reverse proxies, backups, recovery, and security boundaries.

## Database

- Local SQLite: `DATABASE_URL=file:mainnet.db` (the default, even without `.env`).
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

## Backend testing

Backend and domain tests use **@effect/vitest 4.0.0**, compatible with Effect 4 and Vite+'s bundled Vitest 5.
Use `it.effect` / `it.effect.each` to return Effects directly, and `layer(...)` when sharing service fixtures.
The test runner manages scopes, interruption, and test services; don't manually call `Effect.runPromise` in tests.
Database tests use an isolated in-memory libSQL database and apply the real Drizzle migrations.
Run them with `pnpm test`. Do not add UI, component, or browser tests; verify UI changes manually.

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
