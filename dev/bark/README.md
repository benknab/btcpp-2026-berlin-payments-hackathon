# Shared Bark signet test wallet

`signet.mnemonic` contains this wallet's recovery phrase, which derives its private keys. It is deliberately
stored in the repository for development. **Treat it as public: signet only, never mainnet or real funds.**
Do not reuse this phrase for any other wallet or include it in the application's browser bundle.

## Configuration

- CLI: Bark 0.7.1.
- Network: signet.
- Ark server: `https://ark.signet.2nd.dev`.
- Chain source: `https://esplora.signet.2nd.dev`.
- Funded wallet data directory on the development host: `~/.local/share/bark-hackathon-signet`.
- Initial faucet funding verified on 2026-10-01: 300,000 sats. This is not a live balance.

Receiving address:

```text
tark1pem36wcfzqqp5te4j72k4fnmz4jwuu9g5m9tyfe5pvhrprxt7gh0607v40gj2czezqyp56xvwd3fe06pyhg4uv6mpyyh866gnaww6hnv5y9utvcaj0sh98scx6znj3
```

## Using the funded wallet on the development host

```sh
export BARK_DATADIR="$HOME/.local/share/bark-hackathon-signet"
bark balance
bark vtxos
```

The recovery phrase is **not a complete wallet backup**. Server-assisted recovery can recover balances,
but a full restore, including history and in-progress exits, requires the current wallet database as well.
The pinned CLI's `create --help` describes `--mnemonic` recovery as on-chain-only; do not assume creating
a wallet from this phrase automatically reproduces the funded Ark wallet.

Coordinate use of the existing wallet. Do not independently spend from multiple copies of its database;
for independent development, create separate signet wallets and fund them from the faucet instead.

## References

- [Bark signet guide (source of truth)](https://second.tech/docs/getting-started/bark-cli/signet).
- [Wallet backups and recovery](https://second.tech/docs/backups).
- [Signet faucet (GitHub sign-in required)](https://signet.2nd.dev/).
