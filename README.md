# BTC++ 2026 Berlin Payments Hackathon

A hackathon project for **BTC++ 2026 in Berlin**, exploring shared expenses and real money settlement using **Bark**.

## Project idea

We're aiming to build a **Splitwise / Kittysplit-style app** that doesn't stop at calculating who owes whom.
Participants track expenses, then fund an owner-controlled pot to settle their final net balances using Bark.

### V1 scope: owner-controlled settlement pot

1. **Owner creates the group and pot wallet.**
   - Create a dedicated Bark wallet in the owner's browser using `@secondts/bark/web`.
   - Store its public Ark address on the backend; the owner's wallet keys stay in the browser.
   - Back up the mnemonic and wallet data, keeping the data backup current as the wallet changes.
2. **Friends join.**
   - Participants join with a name. Anyone owed money supplies a Lightning address before settlement is locked.
   - Validate receiving addresses and supported payment amounts. V1 uses Lightning addresses (LNURL-pay);
     BOLT12 offers and Nostr profile lookup are later additions.
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
   - Start redistribution after all required contributions are delivered and spendable funds cover payouts and fees.
   - Request invoices automatically from creditors' Lightning addresses. The owner approves, and their browser
     wallet executes the payments.
   - Persist each attempt before sending and confirm each payout individually. Reconcile interrupted or unknown
     outcomes before retrying; payouts are sequential, not an atomic batch.
   - Account for the owner's entitlement, excess contributions, and leftover fees. Mark the group settled only when
     all entitlements are accounted for.

**Trust model:** friends trust the owner with the pot. Our backend is trusted to deliver incoming contributions;
it can redirect those contributions, but holds no owner-wallet keys and has no direct spending authority over funds
already delivered to the owner. The browser wallet still trusts the JavaScript served by the app.

**Wallet lifecycle:** receiving while the owner is offline does not mean funds can be left unattended indefinitely.
Track VTXO expiries and implement refresh/reconnection handling alongside ongoing backups. See Bark's
[browser SDK](https://second.tech/docs/bark-sdk/wasm),
[receive-for-address API](https://second.tech/docs/barkd/api-reference/lightning/create-a-bolt11-invoice-for-an-ark-address),
and [VTXO lifetime documentation](https://second.tech/docs/learn/lifetime).

**First integration milestone:** verify a complete signet round trip: contribution invoice → owner browser closed →
delivery → owner reopens → Lightning payout. Use compatible signet recipients; ordinary mainnet Lightning addresses
cannot receive the test payouts.

**Current status:** group creation, invitations, equal expense splitting, expense management, and personal balance
overviews are implemented. A separate, **server-custodied** Bark signet settlement workspace is available at `/settle`.
Event creation generates a dedicated signet wallet using `@secondts/bark/web` and saves its public address in
`groups.ark_address`. Events can lock net obligations and collect Lightning contributions through a persistent
Barkd receiving wallet, including while the organizer's browser is closed. See [browser pot setup](dev/bark/BROWSER.md).
The owner can pay creditors from the browser wallet, with persisted attempts and payment-proof verification.
The signet round trip has been manually verified with a prepared BOLT11 payout invoice; automatic LNURL resolution
still needs verification against a compatible signet receiving service.

The **Managed settlement** page at `/groups/<inviteKey>/settlement` also supports private participant Bark-address
links, debtor QR codes, deposit progress, and organizer-authorized payouts through a server-held wallet. An event
uses the flow in which it is first locked; the other flow cannot lock or pay it afterward. Managed group payments
have offline integration coverage and still need a live signet rehearsal.

### Browser event wallets

- Use HTTPS or localhost. The SDK loads lazily when creating an event; it does not execute during SSR.
- Each event has its own IndexedDB wallet (`bark-event-<uuid>`). Its mnemonic and public address are kept in this
  browser's localStorage under `bark:event-wallet:<uuid>`. Only the public address is sent to the backend.
- Wallet creation and local persistence must succeed before the event is saved. Retrying within the form reuses
  the wallet. Existing events retain a nullable address; no replacement wallet is generated for them.
- Browser storage is currently unencrypted. Clearing site data loses access. The mnemonic alone is not a full
  Bark backup: wallet-data export/recovery is still required before using this beyond signet demos.
- The pinned `@secondts/bark@0.25.0` uses `Wallet.open("Signet", mnemonic, config, undefined, args)` with
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
Lightning collection on the owner's behalf. The separate `/settle` workspace uses backend Barkd wallets.

## Bark signet development wallet

### Reset the development database

The October 2 integration replaces the divergent migration histories with one generated baseline. Existing local
databases must be reset once after pulling this change. Stop the dev server, then run:

```sh
pnpm db:reset
pnpm dev
```

`db:reset` deletes the SQLite file configured by `DATABASE_URL` (default `file:local.db`), its sidecar files, and
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

Follow [the signet wallet setup](dev/bark/README.md) to create a fresh wallet and fund it from Second's faucet.
Installing the tools or cloning this repository does **not** restore the funded wallet on the remote environment.
An Ark address is only a receiving destination, not a wallet backup. The legacy recovery phrase in
`dev/bark/signet.mnemonic` is public and is not a complete backup of that wallet; never use it for mainnet.

The [backend pot demo](dev/bark/POTS.md) nets a JSON debt setup, assigns participant addresses, confirms deposits,
and pays creditors using the Bark TypeScript SDK wrapped in Effect. Open `/settle` for the local signet settlement
UI: create and list standalone pots at `/settle`, save participants and debts, then open `/settle/<id>` to prepare
deposits. The backend manages a separate signet wallet for each pot. No operator code is required; keep the app local
because standalone settlement actions are unauthenticated. Linked group pots use separate wallets and can only be
operated through the group's organizer-authorized endpoints.

### Group settlement demo

1. Create a group and share its bookkeeping invitation. Record expenses with the actual payer and equal shares.
2. Open **Review settlement & personal addresses**. Generate each participant's private setup link and send it only
   to that person, including yourself. Each participant pastes their own `bark address` result.
3. Click **Refresh status** to load newly saved addresses. Review amounts/destinations, then **Close group** and confirm.
4. Debtors reopen their private link (or choose themselves on the shared group page) to see their deposit QR and amount.
   The QR contains only the Bark address: enter the displayed remaining sats in the wallet. It is not a Lightning invoice.
5. The organizer clicks **Check deposits**, then confirms **Pay creditors** once every debtor is funded.
6. Read confirmed payout movement references. If a response is lost, refresh and **Reconcile and finish payouts**;
   never send manually or reset a `sending` payout.

Configure `BARK_POTS_DATADIR` and the backend-managed Bark daemon as described in [the pot guide](dev/bark/POTS.md).
Each group gets its own isolated signet wallet. All-square groups need no wallet or participant addresses.
Closing cannot be undone; initialization failures keep the group locked and offer **Resume pot setup** with the same
wallet. Keep organizer cookies and private links: account recovery is not implemented. The trusted organizer issues
bearer links; these provide lightweight access, not proof of identity or ownership of the receiving wallet.

This is a custodial signet-only demo: overpayment refunds, fee allocation, and production access controls are not
implemented. The unauthenticated standalone workspace means the whole app must remain local/trusted, even though
group payment actions require organizer authority. Never use mainnet or real funds.

## Start

Use Node 22.23.1 (or a supported newer version) and pnpm 12.8.1.

```sh
pnpm install
cp .env.example .env
pnpm db:migrate
pnpm dev
```

Open <http://localhost:3100> to create a group. Input is validated with Effect Schema and Drizzle queries run as
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
