# Bark signet development wallet

Install **Bark and Barkd 0.7.1** using the [repository installation instructions](../../README.md#install-bark-and-barkd).
Follow [Second's signet guide](https://second.tech/docs/getting-started/bark-cli/signet) for wallet setup and funding.

## Create a fresh local wallet

The default developer wallet path is `~/.local/share/bark-hackathon-signet`. This is a local directory, not a
wallet included in the repository. On a new machine, create a fresh wallet with its own generated keys:

```sh
export BARK_DATADIR="$HOME/.local/share/bark-hackathon-signet"
umask 077
bark create --signet --ark https://ark.signet.2nd.dev --esplora https://esplora.signet.2nd.dev
bark address
```

Do not use `--force` or delete an existing wallet to rerun setup. If this directory already contains a wallet,
use it or choose a different `BARK_DATADIR`; set `BARK_FUNDING_DATADIR` to the same alternative path for the app/demo.
Keep the wallet directory and recovery phrase outside the repository; never print or commit fresh seed phrases.

## Fund and check the wallet

Sign in with GitHub at [Second's signet faucet](https://signet.2nd.dev/) and submit the **address printed by your
local wallet**, not an address copied from another environment. The faucet sends free signet sats over Ark.

```sh
bark balance
bark vtxos
```

The pot demo spends up to **26,000 signet sats per run**. Check the current spendable balance before running it.
Ark-to-Ark demo success does not verify Lightning; Second's signet guide includes a test store for Lightning sends.

## Start the developer daemon

After funding, start Barkd in a separate terminal for the app's test payout addresses and `pnpm pot:demo`:

```sh
barkd --datadir "$HOME/.local/share/bark-hackathon-signet" --host 127.0.0.1 --port 3031 --no-logfile
```

Use your alternative wallet path here if configured. The app/demo default to `http://127.0.0.1:3031`;
`BARK_FUNDING_URL` overrides that URL. Tokens are retrieved internally; do not commit or expose them.
**Do not run Bark CLI wallet commands while Barkd is using the same wallet database.** Stop the daemon first.

## Existing remote wallet and backups

The funded wallet used for the 2026-10-01 demo lives on the **remote development environment**, not automatically
on every checkout. Its initial 300,000-sat funding is historical, not a live or local balance.
Its old receiving address has been removed from setup instructions to avoid funding a wallet unavailable locally.
An address cannot restore keys, VTXOs, or payment history.

`signet.mnemonic` is that legacy wallet's intentionally public recovery phrase. **Signet only; never mainnet or
real funds.** It is not a complete wallet backup and must not be included in the browser bundle or reused for new wallets.
The pinned CLI's `create --help` describes `--mnemonic` recovery as on-chain-only; do not assume it reproduces
the funded Ark wallet. Server-assisted recovery exists, but a full restore, including history and in-progress
exits, requires the current wallet database as well.

Prefer independent, freshly funded wallets on separate machines. If migrating the remote wallet instead, stop
its daemon first, transfer the complete current wallet directory securely, and stop using the original copy.
Do not spend independently from multiple copies of the same wallet database. Preserve pot wallet data together
with the app database when migrating existing pots; the developer wallet alone is not a backup of them.

## References

For the backend JSON-to-deposits-to-payouts flow, see [the pot demo](POTS.md).

- [Bark signet guide (source of truth)](https://second.tech/docs/getting-started/bark-cli/signet).
- [Wallet backups and recovery](https://second.tech/docs/backups).
- [Signet faucet (GitHub sign-in required)](https://signet.2nd.dev/).
