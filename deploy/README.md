# Docker deployment

One container runs the production TanStack Start server, Bark 0.7.1, and a continuously running authenticated Barkd
receiver. The receiver delivers contributions to browser-owned event wallets, including while owners are offline.
Only the owner's browser wallet executes payouts. The legacy server-owned `/settle` workspace and backend actions
are removed; events and invitations are public without a shared Basic login.

**This is a small-amount prototype, not an audited production payment system.** Organizer and participant cookie
checks remain, as do cross-origin action checks. Name selection is not authenticated identity, and owner recovery
is self-declared rather than cryptographically proven. Keep invitation links private and use small amounts with
trusted participants. See [the trust boundaries](../README.md#browser-event-wallets).

## Start locally

Requirements: Docker Engine / Docker Desktop and Docker Compose v2. Use an x86-64 Linux VPS for deployment.
Compose explicitly selects `linux/amd64`; Apple Silicon can test it through Docker Desktop emulation.

```sh
docker compose up --detach --build --wait --wait-timeout 180
```

Open <http://localhost:3100>. No host `.env`, preinstalled Bark, or manually copied
Bark token is required. Do not print `runtime.env`: it contains the server-only Bark bearer token.

On first start, the entrypoint:

1. Creates a new **unfunded mainnet** receiving wallet using Second's Ark and Esplora endpoints.
2. Creates a private receiver token.
3. Starts Barkd bound to `127.0.0.1:3042` **inside the container** and verifies its mainnet connection.
4. Applies committed Drizzle migrations without resetting existing application data.
5. Writes `/data/runtime.env` with mode `0600` and supplies Bark settings to the application automatically.
6. Serves the built app and static assets on port 3100. `/healthz` checks SQLite and the authenticated local receiver.

Subsequent starts reuse the same wallet, token, and database. Missing initialized wallet/database/credential
files cause startup to fail rather than silently replacing them. A filesystem lock prevents two containers from
running this deployment against the same volume. **Do not scale this service above one instance.**

The receiver stays online when browsers close. If Barkd exits, the supervisor stops the app and exits nonzero;
Compose restarts the entire service. On shutdown, the HTTP server drains first, then Barkd receives SIGTERM.
Docker's unhealthy status alone does not trigger a restart: monitor it and investigate stalled/unhealthy services.

## HTTPS on a VPS

Point your domain's A/AAAA records at the VPS and permit inbound TCP ports 80/443. Then:

```sh
PUBLIC_HOST=payments.example.com docker compose -f compose.yaml -f compose.https.yaml up --detach --build --wait --wait-timeout 180
```

The optional Caddy service obtains and renews certificates automatically. The app port remains host-loopback-only;
the receiver port is not published. Set `PUBLIC_HOST` in a host `.env` if desired so future
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

Then point the domain at that public proxy's IP. Proxy all app paths and preserve cookies; do not cache application
responses. Barkd's port 3042 must not have a host port mapping.

The configured `PUBLIC_ORIGIN` is used for SSR, secure cookies, and cross-origin action checks; arbitrary forwarded
headers are not trusted. Use the public origin consistently for browser wallets and write actions. A proxy in
another container can join the app's Compose network and target `http://app:3100` instead of using a host port.

### Homeserver with the remote Caddy proxy

The homeserver deployment uses port 3101 because another builder's development server uses 3100. Set the app
repository's ignored `.env` to:

```dotenv
APP_BIND_IP=100.64.252.97
APP_PORT=3101
PUBLIC_ORIGIN=https://splitbark.hospitablealpaca.com
```

Run `docker compose up --detach --build --wait --wait-timeout 180` from this repository. On `homeserver-proxy`
(`100.114.136.58`), add this site block to the existing Caddyfile:

```caddyfile
splitbark.hospitablealpaca.com {
    reverse_proxy 100.64.252.97:3101
}
```

Point the public hostname's DNS at the proxy's public IP, not the homeserver or its Tailscale IP. Allow the proxy
to reach the homeserver's TCP 3101 through Tailscale access controls; keep this port off public and LAN interfaces.
From the proxy, `curl --fail http://100.64.252.97:3101/healthz` should return `ok`. For a systemd Caddy installation:

```sh
sudo caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
sudo systemctl reload caddy
```

Use the HTTPS hostname for browser wallets and form submissions; direct-IP HTTP only checks reachability and page
serving. The configured public origin rejects write requests from the IP origin. The HTTPS homepage should return
200 without a login prompt; `/settle` should return 404.

## Optional configuration

Only these host environment / Compose `.env` values configure the deployment:

| Variable                   | Default                     | Purpose                                                                     |
| -------------------------- | --------------------------- | --------------------------------------------------------------------------- |
| `APP_PORT`                 | `3100`                      | Host port; container port stays 3100.                                       |
| `PUBLIC_ORIGIN`            | unset                       | Exact HTTPS origin when using an external reverse proxy. No trailing slash. |
| `PUBLIC_HOST`              | required for HTTPS override | Domain used by Caddy and to set `PUBLIC_ORIGIN`.                            |
| `APP_BIND_IP`              | `127.0.0.1`                 | Host bind address; use a restricted private interface for a remote proxy.   |
| `BARK_PAYMENTS_SOURCE_DIR` | `.`                         | Source path when Compose lives outside the source repository.               |

There is no shared deployment login. Old `APP_AUTH_*` host values are no longer used, and runtime configuration is
rewritten without them on restart. The receiver token is never rotated implicitly after initialization; never use
a `VITE_` variable for this secret.

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
| `/data/pots/`       | Historical standalone wallet data, if present; preserved for recovery, not used by the app.      |
| `/data/runtime.env` | Server-only receiver credentials and configuration.                                              |
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
receiver invoice/API and a small amount. Do not transfer sats as a deployment health check.
Wallet expiry/refresh scheduling, browser wallet backup/import, and a funded end-to-end settlement rehearsal remain
application responsibilities, not features supplied by Docker.

## Operations

```sh
docker compose ps
docker compose logs --tail 100 app
curl --fail http://localhost:3100/healthz
docker compose up --detach --build --wait --wait-timeout 180
```

Back up before upgrades. Do not roll back code across incompatible migrations. Removing the standalone pot engine
does not drop its historical tables or delete wallet directories; this update needs no migration or reset. For any
historical funded pot, keep the database and wallet together and see [the retirement note](../dev/bark/POTS.md).
