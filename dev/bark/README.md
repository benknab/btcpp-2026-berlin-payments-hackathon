# Bark mainnet development wallet

Install **Bark and Barkd 0.7.1** using the [repository installation instructions](../../README.md#install-bark-and-barkd).
Follow [Second's mainnet guide](https://second.tech/docs/getting-started/bark-cli/mainnet) for wallet setup and funding.

## Create a fresh local wallet

The default developer wallet path is `~/.local/share/bark-hackathon-mainnet`. This is a local directory, not a
wallet included in the repository. On a new machine, create a fresh wallet with its own generated keys:

```sh
export BARK_DATADIR="$HOME/.local/share/bark-hackathon-mainnet"
umask 077
bark create --mainnet --ark https://ark.second.tech --esplora https://mempool.second.tech/api
bark address
```

Do not use `--force` or delete an existing wallet to rerun setup. If this directory already contains a wallet,
use it or choose a different `BARK_DATADIR`.
Keep the wallet directory and recovery phrase outside the repository; never print or commit fresh seed phrases.

## Fund and check the wallet

Generate a small mainnet Lightning invoice and pay it from your Lightning wallet:

```sh
bark ln invoice "3000 sats"
```

For browser-event LNURL testing, use the separate [receiving-daemon setup](BROWSER.md).

```sh
bark balance
bark vtxos
```

The app's event wallets live in the owner's browser, not in this developer wallet. Never send real sats as a deployment
health check. Ark-to-Ark success does not verify Lightning or LNURL payouts.

## Start the developer daemon

For independent developer-wallet API experiments, start Barkd in a separate terminal:

```sh
barkd --datadir "$HOME/.local/share/bark-hackathon-mainnet" --host 127.0.0.1 --port 3041 --no-logfile
```

Use your alternative wallet path here if configured. The app does not connect to this daemon;
its dedicated receiving daemon uses port 3042. Do not commit or expose daemon tokens.
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

For the supported event flow, see [browser-owned event pots](BROWSER.md). The [server-owned pot demo](POTS.md) is retired.

- [Bark mainnet guide (source of truth)](https://second.tech/docs/getting-started/bark-cli/mainnet).
- [Wallet backups and recovery](https://second.tech/docs/backups).
- [Mainnet connection details](https://second.tech/docs/connection-details).
