# Deployment

Docker runs the app and an authenticated Barkd receiver together. The receiver stays online to deliver contributions
while owners are offline; payouts run in owner browsers. **Use small amounts with trusted participants.**
See [wallet recovery and trust boundaries](../dev/bark/BROWSER.md#recovery-and-trust).

## Start

Use Docker Engine/Desktop and Compose v2. Deployment targets Linux x86-64; Apple Silicon uses emulation.

```sh
docker compose up --detach --build --wait --wait-timeout 180
```

Open <http://localhost:3100>. No host Bark installation, token setup, or shared login is required.
The container creates an unfunded mainnet receiver and private credentials, applies migrations, and reuses the
same data on restart. Do not print `/data/runtime.env`: it contains the receiver token.
If the receiver requires funding, use its invoice/API explicitly; never transfer sats as a health check.

Run only one app instance per volume. Missing initialized wallet or database files cause startup to fail rather
than replacing them. If Barkd exits, the app exits and Compose restarts it. Monitor unhealthy containers;
Docker health status alone does not trigger a restart.

## HTTPS

Point a domain at your server and allow inbound TCP 80/443:

```sh
PUBLIC_HOST=payments.example.com docker compose -f compose.yaml -f compose.https.yaml up --detach --build --wait --wait-timeout 180
```

Caddy obtains and renews certificates. Set `PUBLIC_HOST` in the host's ignored `.env` for subsequent commands,
and keep using both Compose files for updates and shutdowns.
Choose the final HTTPS origin before creating funded events: browser wallet storage and cookies do not move
between localhost, domains, or ports.

### Existing reverse proxy

Use the base Compose file without the HTTPS override. Set the host's `.env`:

```dotenv
APP_BIND_IP=127.0.0.1
APP_PORT=3100
PUBLIC_ORIGIN=https://payments.example.com
```

Example Caddy configuration on the same host:

```caddyfile
payments.example.com {
    reverse_proxy 127.0.0.1:3100
}
```

For a remote proxy, bind to a restricted private interface and allow only the proxy to reach the app port.
Do not bind the app to a public interface or publish Barkd's port 3042. Proxy all paths, preserve cookies,
and do not cache application responses. `PUBLIC_ORIGIN` must match the HTTPS origin used by browsers;
write requests from other origins are rejected.

## Configuration

| Variable                   | Default                     | Purpose                                                             |
| -------------------------- | --------------------------- | ------------------------------------------------------------------- |
| `APP_PORT`                 | `3100`                      | Host port; container port stays 3100.                               |
| `APP_BIND_IP`              | `127.0.0.1`                 | Host bind address.                                                  |
| `PUBLIC_ORIGIN`            | unset                       | Exact HTTPS origin for an existing proxy, without a trailing slash. |
| `PUBLIC_HOST`              | required for HTTPS override | Domain served by Caddy.                                             |
| `BARK_PAYMENTS_SOURCE_DIR` | `.`                         | Build source path if Compose runs outside the repository.           |

Receiver credentials are managed inside the container, not through host `.env` or `VITE_` variables.

## Backups and recovery

The `payments-data` volume contains the application database, full receiving wallet, private runtime configuration,
and payment logs. Historical wallet directories, if present, are retained for recovery.
Back up the entire volume together, encrypted and off-host. Server backups do **not** include browser-owned wallets.
A recovery phrase alone is not a complete Bark wallet backup; see [Second's backup guide](https://second.tech/docs/backups).

For an offline archive:

```sh
umask 077
docker compose stop app
docker compose run --rm --no-deps -T --entrypoint tar app --create --gzip --file=- --directory=/data . > payments-data.tar.gz
docker compose up --detach --wait --wait-timeout 180 app
```

This briefly stops contribution delivery. The archive contains spending keys and credentials; encrypt it before
transferring it and never commit it. Use both Compose files if deploying with Caddy.

Restore only into an empty, stopped deployment volume, with no other running copy of these wallets:

```sh
docker compose run --rm --no-deps -T --entrypoint tar app --extract --gzip --file=- --no-same-owner --directory=/data < payments-data.tar.gz
docker compose up --detach --wait --wait-timeout 180
```

Do not delete wallet directories, reset the deployed database, run `docker compose down --volumes`, or accidentally
change the Compose project name. Do not run Bark CLI wallet commands while Barkd uses the same wallet database.
For any historical funded wallet, keep its matching database and reconcile payment history before attempting recovery.

## Operations

For automatic deployment on pushes to `master` after CI passes, see [push deployment setup](PUSH.md).
It deploys on this machine over restricted SSH, without modifying the development checkout or replacing wallet data.

```sh
docker compose ps
docker compose logs --tail 100 app
curl --fail http://localhost:3100/healthz
docker compose up --detach --build --wait --wait-timeout 180
```

Back up before upgrades and do not roll back across incompatible migrations. Rotate `/data/logs` separately from
Docker's bounded container logs. Wallet expiry/refresh handling and complete browser-wallet backups remain prototype
limitations; Docker does not provide them.
