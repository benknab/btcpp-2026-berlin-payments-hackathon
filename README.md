# Splitbark

Kittysplit + [Bark](https://second.tech).

Shared expenses with Bitcoin settlement, built for the
[bitcoin++ Berlin 2026 payments hackathon](https://btcpp.dev/berlin26/hackathon).

## How it works

1. **Create an event.** The owner gets a Bark wallet in their browser. Save its recovery phrase to restore funds later.
   Invite participants and have them choose their receiving destinations.
2. **Add expenses.** Record who paid and split costs equally, by exact amounts, by weights, or by percentages.
3. **Settle up.** Start settlement to lock the balances. Participants who owe money pay the owner via Lightning
   invoices. A server-side Barkd receiver uses Bark's receive-for-address flow to deliver contributions to the
   owner's event wallet, even while the owner's browser is closed.
4. **Pay participants.** The owner reopens the event, syncs their Bark wallet, funds any required payment fees,
   and sends payouts from their browser to Lightning addresses, LNURL-pay, BOLT12 offers, or mainnet Ark addresses.

The recovery phrase restores spendable Ark funds, not payment history or in-progress exits; it is not a complete
wallet-data backup. See [wallet recovery and trust boundaries](dev/bark/BROWSER.md#recovery-and-trust).

Created and joined events appear under **Your events** on the home page. This browser stores only their invitation
IDs in local storage; event names are fetched from the server. Clearing browser storage clears this list.

## Run locally

Use Node 22.23.1 or a supported newer version and pnpm 12.8.1.
Install [Bark and Barkd 0.7.1](dev/bark/README.md), then:

```sh
pnpm install
cp .env.example .env
pnpm db:migrate
pnpm dev
```

Open <http://localhost:3100>. The development command starts or reuses the receiving daemon.
For Docker, including Bark and database setup:

```sh
docker compose up --detach --build --wait --wait-timeout 180
```

## Demo presets

Open the bottom-right **Demo** menu to create a populated event: **Coffee** (200 sats), **Dinner** (300 sats), or
**Berlin weekend** (500 sats). The three presets total **1,000 sats combined** and include Vini, Ben, Dingo, and
MintMonkey with their receiving destinations. Setup does not send payments; fees are separate.

Use **Saved events** in the menu to reopen an event or copy its link. Creating a preset again creates a fresh event
without resetting previous events or wallets. See [preset setup and payment flow](dev/bark/BROWSER.md#demo-presets).

## Safety

**This is a mainnet hackathon prototype. Use small amounts with trusted participants.**
Participants trust the owner with the pot and the backend to deliver contributions. Owner wallet keys stay in
the browser, in unencrypted storage; the wallet also trusts the JavaScript served by the app.
Name selection is not identity verification, and owner access recovery is self-declared.
Keep invitation links private, save the event recovery phrase, and reconcile uncertain payments before retrying.

## Guides

- [Event settlement and wallet recovery](dev/bark/BROWSER.md)
- [Development commands and database resets](dev/README.md)
- [Deployment and backups](deploy/README.md)
- [Payment diagnostics](dev/observability/README.md)
