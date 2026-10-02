# Payment diagnostics

`pnpm dev` writes structured server logs to the terminal and to the paths below:

```sh
tail -f "$HOME/.local/share/bark-payments-mainnet/logs/server.jsonl"
tail -f "$HOME/.local/share/bark-event-receiver-mainnet/dev-barkd.log"
```

Override the server log directory with `PAYMENTS_LOG_DIR`. Browser wallet logs appear in DevTools;
enable **Preserve log** when investigating reloads. Server files are append-only; rotate them as needed.
Logs contain payment hashes, event/participant IDs, amounts, and statuses. Keep logs private and redact them before sharing.

## Optional local viewer

```sh
docker compose -f dev/observability/compose.yaml up -d
```

Set these in `.env` and restart the app:

```dotenv
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
VITE_OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
OTEL_SERVICE_NAME=payments-server
```

Open <http://localhost:3001> (development login: `admin` / `admin`, if prompted).
Use Grafana **Explore → Tempo** for `payments-server` / `payments-browser` traces, **Loki** for logs, and
**Prometheus** for operation counts and durations. Correlate work using trace IDs and payment hashes.
The viewer is local-only. Keep collector credentials out of `VITE_` variables.

Stop it with `docker compose -f dev/observability/compose.yaml down`; its named volume retains collected data.

## Troubleshooting

- **Contribution:** check invoice creation and receiver receipt status. Paid does not necessarily mean delivered.
- **Wallet sync:** check for another tab holding the wallet lock.
- **Fees:** compare required sats with spendable sats and fund the owner's fee reserve if needed.
- **LNURL:** inspect HTTP status, receiver limits, and browser CORS failures in the Network panel.
- **Payout:** check the saved attempt and reconciliation result before retrying. Never blindly resend an uncertain payment.

App telemetry redacts exception contents and SQL attributes; it does not log full invoices, preimages, recovery
phrases, cookies, or bearer tokens. Barkd's native logs are separate and should also be treated as private.
