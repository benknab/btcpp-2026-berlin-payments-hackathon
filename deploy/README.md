# Docker deployment

One container runs the production TanStack Start server, Bark 0.7.1, and a continuously running authenticated Barkd
receiver. Managed pots can also start their own isolated Barkd subprocesses inside this container.

**This is a hardened deployment of a small-amount prototype, not an audited production custody system.** The entire
site, including server functions and assets, requires a shared HTTP Basic login. Give it only to trusted operators
and demo participants: anyone with this login can operate the unauthenticated standalone `/settle` workspace.
Public, password-free invitations require additional application authorization work; do not remove this gate.

## Start locally

Requirements: Docker Engine / Docker Desktop and Docker Compose v2. Use an x86-64 Linux VPS for deployment.
Compose explicitly selects `linux/amd64`; Apple Silicon can test it through Docker Desktop emulation.

```sh
docker compose up --detach --build --wait --wait-timeout 180
docker compose exec app grep '^APP_AUTH_' /data/runtime.env
```

Open <http://localhost:3100> and enter the displayed login. No host `.env`, preinstalled Bark, or manually copied
Bark token is required. Do not print the entire `runtime.env`: it also contains the server-only Bark bearer token.

On first start, the entrypoint:

1. Creates a new **unfunded mainnet** receiving wallet using Second's Ark and Esplora endpoints.
2. Creates a private receiver token and a random 256-bit login password.
3. Starts Barkd bound to `127.0.0.1:3042` **inside the container** and verifies its mainnet connection.
4. Applies committed Drizzle migrations without resetting existing application data.
5. Writes `/data/runtime.env` with mode `0600` and supplies Bark settings to the application automatically.
6. Serves the built app and static assets on port 3100. `/healthz` checks SQLite and the authenticated local receiver.

Subsequent starts reuse the same wallet, token, password, and database. Missing initialized wallet/database/credential
files cause startup to fail rather than silently replacing them. A filesystem lock prevents two containers from
running this deployment against the same volume. **Do not scale this service above one instance.**

The receiver stays online when browsers close. If Barkd exits, the supervisor stops the app and exits nonzero;
Compose restarts the entire service. On shutdown, the HTTP server drains first, then Barkd receives SIGTERM.
Docker's unhealthy status alone does not trigger a restart: monitor it and investigate stalled/unhealthy services.

## HTTPS on a VPS

Point your domain's A/AAAA records at the VPS and permit inbound TCP ports 80/443. Then:

```sh
PUBLIC_HOST=payments.example.com docker compose -f compose.yaml -f compose.https.yaml up --detach --build --wait --wait-timeout 180
docker compose exec app grep '^APP_AUTH_' /data/runtime.env
```

The optional Caddy service obtains and renews certificates automatically. The app port remains host-loopback-only;
neither the receiver nor per-pot daemon ports are published. Set `PUBLIC_HOST` in a host `.env` if desired so future
Compose invocations use the same domain, and keep using both Compose files for updates and shutdowns.

Choose the final HTTPS origin **before** creating funded events. Browser wallets, localStorage/IndexedDB, and organizer
cookies do not move from localhost to the deployed domain. Backing up the server does not back up browser-owned wallets.

## Existing reverse proxy

Use the base `compose.yaml`, without the Caddy override, when an existing reverse proxy handles HTTPS.

Set these non-secret values in the deployment host's `.env`:

```dotenv
APP_BIND_IP=127.0.0.1
APP_PORT=3100
PUBLIC_ORIGIN=https://payments.example.com
# Optional, when Compose lives outside the source repository:
BARK_PAYMENTS_SOURCE_DIR=/path/to/source
```

Keep the loopback binding for a proxy on the same host. For a remote proxy, set `APP_BIND_IP` to a private interface
address and restrict TCP 3100 to the proxy using network access controls. Ensure the interface exists before
starting Compose. Do not bind the app to `0.0.0.0` or a public interface.

For example, a Caddy proxy on the same host can use:

```caddyfile
payments.example.com {
    reverse_proxy 127.0.0.1:3100
}
```

Then point the domain at that public proxy's IP. Keep the generated Basic login: a public proxy does not add
application authorization. Proxy all app paths without stripping `Authorization`, and do not cache authenticated
responses. Neither Barkd's port 3042 nor any per-pot daemon port needs a host port mapping.

The configured `PUBLIC_ORIGIN` is used for SSR, secure cookies, and cross-origin action checks; arbitrary forwarded
headers are not trusted. Use the public origin consistently for browser wallets and write actions. A proxy in
another container can join the app's Compose network and target `http://app:3100` instead of using a host port.

## Optional configuration

Only these host environment / Compose `.env` values configure the deployment:

| Variable                   | Default                     | Purpose                                                                     |
| -------------------------- | --------------------------- | --------------------------------------------------------------------------- |
| `APP_PORT`                 | `3100`                      | Host port; container port stays 3100.                                       |
| `PUBLIC_ORIGIN`            | unset                       | Exact HTTPS origin when using an external reverse proxy. No trailing slash. |
| `APP_AUTH_USERNAME`        | generated config / `admin`  | Alphanumeric, underscore, or hyphen.                                        |
| `APP_AUTH_PASSWORD`        | existing / random           | At least 24 URL-safe alphanumeric, underscore, or hyphen characters.        |
| `PUBLIC_HOST`              | required for HTTPS override | Domain used by Caddy and to set `PUBLIC_ORIGIN`.                            |
| `APP_BIND_IP`              | `127.0.0.1`                 | Host bind address; use a restricted private interface for a remote proxy.   |
| `BARK_PAYMENTS_SOURCE_DIR` | `.`                         | Source path when Compose lives outside the source repository.               |

To rotate the shared login, set `APP_AUTH_PASSWORD` to a new long random password and recreate the app with Compose.
The new value is persisted; unsetting the override later does not revert it. Bark credentials are managed separately
and are never rotated implicitly after initialization. Never use a `VITE_` variable for either secret.

The container uses UID/GID 1000, a read-only root filesystem, dropped capabilities, no privilege escalation,
bounded Docker logs, and memory/process limits. Only `/data` and an ephemeral `/tmp` are writable.
`.dockerignore` denies everything except explicitly allowlisted build inputs; local `.env`, databases, wallets,
notebook files, and backups cannot enter the build context. Bark downloads are pinned and SHA-256 checked.

## Persistence and backups

The `payments-data` named volume contains:

| Path                | Contents                                                                                         |
| ------------------- | ------------------------------------------------------------------------------------------------ |
| `/data/mainnet.db`  | Events, expenses, payment attempts, migration history.                                           |
| `/data/receiver/`   | Receiving wallet's full database, mnemonic, and auth state.                                      |
| `/data/pots/`       | Full databases, mnemonics, and auth state for managed pot wallets.                               |
| `/data/runtime.env` | Generated application and Bark credentials.                                                      |
| `/data/logs/`       | Payment diagnostics. Rotate/retain these files separately; Docker log limits do not rotate them. |

**Back up the entire volume together**, encrypted and off-host, and test recovery before using meaningful amounts.
A mnemonic alone is not a Bark wallet backup. See [Second's backup guide](https://second.tech/docs/backups).
Use consistent disk/volume snapshots or stop the service for a complete offline archive. For example:

```sh
umask 077
docker compose stop app
docker compose run --rm --no-deps -T --entrypoint tar app --create --gzip --file=- --directory=/data . > payments-data.tar.gz
docker compose up --detach --wait --wait-timeout 180 app
```

These commands briefly stop offline Lightning delivery. Encrypt and transfer the archive to your backup destination;
the archive contains spending keys and credentials. For deployments with Caddy, use both Compose files as usual.

Restore only into an **empty, stopped deployment volume**, with no running copies of these wallets:

```sh
docker compose run --rm --no-deps -T --entrypoint tar app --extract --gzip --file=- --no-same-owner --directory=/data < payments-data.tar.gz
docker compose up --detach --wait --wait-timeout 180
```

Do not reset the deployed database, delete wallet directories, run `docker compose down --volumes`, or change
the Compose project name unintentionally: a different project name selects a different named volume. Do not run
`bark` wallet commands against a database while its Barkd is running; use its authenticated API instead.

The initial wallet is not automatically funded. If Second requires an anti-DoS reserve, fund it explicitly using a
receiver invoice/API and a small amount. Never run `pnpm pot:demo` as a deployment test: that command transfers real sats.
Wallet expiry/refresh scheduling, browser wallet backup/import, and a funded end-to-end settlement rehearsal remain
application responsibilities, not features supplied by Docker.

## Operations

For automatic deployment on pushes to `master` after CI passes, see [push deployment setup](PUSH.md).
It deploys on this machine over restricted SSH, without modifying the development checkout or replacing wallet data.

```sh
docker compose ps
docker compose logs --tail 100 app
curl --fail http://localhost:3100/healthz
docker compose up --detach --build --wait --wait-timeout 180
```

Back up before upgrades. Do not roll back code across incompatible migrations. An interrupted managed-pot send is
reconciled using the original database and wallet, never by recreating/resetting either. A crash may leave a per-pot
`.lock` directory; follow `dev/bark/POTS.md` and inspect wallet history before manually removing a stale lock.
