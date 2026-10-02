# Deploy on push to this machine

Pushes to **`master`** run the existing checks, tests, and build on GitHub-hosted runners. Only a successful run
can invoke the machine's restricted SSH deployment command. Pull requests and other branches never deploy.
No polling, webhook listener, or self-hosted Actions runner is needed.

The server fetches the exact current `master` commit into a separate worktree, builds the Docker image while the
old app stays online, then replaces the app and waits for health checks. Concurrent deployments are serialized;
stale commits are skipped. The fixed `bark-payments` Compose project preserves its database, credentials, and wallets.
The development checkout is not pulled, cleaned, reset, or otherwise modified.

## One-time administrator setup

**Not enabled yet:** the current `vini` account cannot access Docker or sudo, and `gh` is not authenticated.
An administrator must perform the host setup, and a repository administrator must configure GitHub.
Port 3100 is currently occupied, so the example below uses loopback port 3101.

Docker access is effectively root access. Use a dedicated deployment account, not the development account.
Only trusted maintainers may push to `master`: their Dockerfile, Compose configuration, and application code execute
on this machine and can access mainnet wallet data. Protect `master`, review workflow/deployment changes, and do not
register this shared Bitcoin host as a self-hosted runner for the public repository.

From the repository directory, an administrator runs:

```sh
sudo adduser --system --group --home /var/lib/bark-payments-deploy --shell /bin/bash bark-deploy
sudo usermod --append --groups docker bark-deploy
sudo install -d -m 755 /usr/local/libexec
sudo install -m 755 -o root -g root deploy/deploy-on-push.sh /usr/local/libexec/bark-payments-deploy
sudo install -d -m 750 -o root -g bark-deploy /etc/bark-payments
sudo install -m 640 -o root -g bark-deploy /dev/null /etc/bark-payments/compose.env
sudoedit /etc/bark-payments/compose.env
```

Set the configuration to:

```dotenv
APP_BIND_IP=127.0.0.1
APP_PORT=3101
# If an existing HTTPS proxy exposes this port, set its exact public origin:
# PUBLIC_ORIGIN=https://payments.example.com
```

For an existing Docker deployment, use its current port/configuration and confirm it uses the `bark-payments`
project and `bark-payments_payments-data` volume before proceeding. Never select a fresh volume for funded wallets.
This command uses the base Compose file; route HTTPS through an existing proxy as described in [README.md](README.md).
It does not stop other applications or configure a public HTTP endpoint.
The first Docker deployment creates its own unfunded receiver and database; it does not import the development
database or local Bark wallets. Browser-owned event wallets are also separate and tied to their original browser origin.

## Restricted deployment key

Generate a dedicated SSH key on a trusted administrator workstation:

```sh
ssh-keygen -t ed25519 -N '' -C bark-payments-github-deploy -f ./bark-payments-deploy-key
```

On this machine, create the deployment account's SSH directory:

```sh
sudo install -d -m 700 -o bark-deploy -g bark-deploy /var/lib/bark-payments-deploy/.ssh
sudoedit /var/lib/bark-payments-deploy/.ssh/authorized_keys
```

Add the public key from `bark-payments-deploy-key.pub` as **one line**, prefixed with:

```text
restrict,command="/usr/local/libexec/bark-payments-deploy" ssh-ed25519 <public-key> bark-payments-github-deploy
```

Then secure the file:

```sh
sudo chown bark-deploy:bark-deploy /var/lib/bark-payments-deploy/.ssh/authorized_keys
sudo chmod 600 /var/lib/bark-payments-deploy/.ssh/authorized_keys
```

The key cannot open a shell, allocate a terminal, or forward ports. The installed command accepts only
`deploy <commit hash>` and deploys only the current `master` tip. It does not evaluate remote shell input.
The root-owned installed script is not automatically replaced on push; reinstall it after reviewing script changes.

## GitHub configuration

In repository **Settings → Secrets and variables → Actions**, add these **repository variables**:

| Variable          | Value                                        |
| ----------------- | -------------------------------------------- |
| `DEPLOY_SSH_HOST` | This machine's SSH hostname or reachable IP. |
| `DEPLOY_SSH_USER` | `bark-deploy`                                |
| `DEPLOY_SSH_PORT` | `22`, unless direct SSH uses another port.   |
| `DEPLOY_ENABLED`  | `true`, after completing setup.              |

Create a **`production` environment**, limit its deployment branches to `master`, and add these secrets there:

| Secret                   | Value                                                       |
| ------------------------ | ----------------------------------------------------------- |
| `DEPLOY_SSH_KEY`         | Entire private deployment key, including its header/footer. |
| `DEPLOY_SSH_KNOWN_HOSTS` | Verified SSH host-key entry for the configured hostname.    |

Obtain the host public key from this machine's `/etc/ssh/ssh_host_ed25519_key.pub` through a trusted administrator.
The known-hosts line is `<hostname> ssh-ed25519 <host-public-key>`; direct SSH on a nonstandard port uses
`[hostname]:<port>` instead. Do not disable host-key checking or blindly trust a network `ssh-keyscan` result.
Do not commit either the private key or deployment configuration. Environment approval rules, if configured,
pause each deployment until approved; leave approvals off if fully automatic trusted-branch deployment is intended.

### Existing Cloudflare SSH tunnel

This machine has an SSH tunnel ingress for **`ssh.hospitablealpaca.net`**. It is not an ordinary public TCP SSH endpoint.
Have an administrator confirm that the tunnel is running and that this is the intended deployment hostname.
To use it without opening an inbound port, set `DEPLOY_SSH_HOST=ssh.hospitablealpaca.net` and the repository variable
`DEPLOY_USE_CLOUDFLARE=true`. The workflow downloads a pinned, SHA-256-checked `cloudflared` binary and uses
`cloudflared access ssh` as its SSH proxy. The deployment account still requires normal SSH key authentication.

If Cloudflare Access protects that hostname, an administrator must create a service token and a **Service Auth**
policy allowing it. Store the token as `CLOUDFLARE_ACCESS_CLIENT_ID` and `CLOUDFLARE_ACCESS_CLIENT_SECRET` secrets
in the `production` environment. An interactive browser login is not suitable for CI. This setup does not modify
the existing tunnel, SSH routing, or Access policies.

## Verify and operate

Commit and push these deployment files, then open **Actions → CI**. The `deploy` job should follow `validate`.
Use **Run workflow** on `master` for a manual retry; other branches remain blocked. Check locally as an administrator:

```sh
sudo docker compose --project-name bark-payments -f compose.yaml ps
sudo docker compose --project-name bark-payments -f compose.yaml logs --tail 100 app
curl --fail http://127.0.0.1:3101/healthz
```

Back up the full deployment volume before enabling unattended upgrades with meaningful funds. Container replacement
briefly interrupts Barkd receiving; it resumes using the same wallet. Migrations run at startup and never reset data.
Failed builds leave the existing app running; failed startup is reported as a failed Actions job and is not automatically
rolled back across migrations. A force-push that is not a descendant of the last successful deployment is refused.
Release worktrees/images are retained for diagnosis; monitor disk space and prune unused releases manually.
Set `DEPLOY_ENABLED=false` to stop future automatic deployments without stopping the app.
