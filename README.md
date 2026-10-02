# Splitbark

Kittysplit + [Bark](https://second.tech).

Shared expenses with Bitcoin settlement, built for the
[bitcoin++ Berlin 2026 payments hackathon](https://btcpp.dev/berlin26/hackathon).

## How it works

1. Create an event and invite participants.
2. Record expenses with equal, exact, weighted, or percentage splits.
3. Start settlement to lock the balances. Participants who owe money pay a Lightning invoice.
4. Contributions arrive in the owner's event wallet, even while their browser is closed.
5. The owner funds payment fees and pays participants from their browser wallet.

Receiving destinations can be Lightning addresses/LNURL-pay, mainnet Ark addresses, or BOLT12 offers.

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
