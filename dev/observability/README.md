# Payment diagnostics

## Logs available immediately

`pnpm dev` emits structured Effect JSON logs to the terminal and appends server logs to:

```sh
tail -f "$HOME/.local/share/bark-payments-mainnet/logs/server.jsonl"
tail -f "$HOME/.local/share/bark-event-receiver-mainnet/dev-barkd.log"
```

Override the server log directory with `PAYMENTS_LOG_DIR`. Browser wallet and LNURL logs appear in Chromium's
DevTools console; enable **Preserve log** before testing. Barkd's native log is separate from Effect telemetry.
Server logs survive Vite restarts; they are append-only, so archive/remove old files between demo sessions as needed.

Every observed operation logs `operation.started` and `operation.completed` or `operation.failed`, with its
operation name, trace/span IDs, duration in milliseconds, outcome, and server request ID. Payment transitions add
group/participant IDs, payment hashes, amounts, statuses, expiries, fee requirements, and spendable balances.

## OpenTelemetry viewer

With Docker running:

```sh
docker compose -f dev/observability/compose.yaml up -d
```

Set these in `.env`, then restart `pnpm dev`:

```dotenv
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
VITE_OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
OTEL_SERVICE_NAME=payments-server
```

Open **http://localhost:3001** (Grafana's development image uses `admin` / `admin` if prompted).
In **Explore**, choose **Tempo** and search service `payments-server` or `payments-browser`, or paste a `traceId`
from the logs. Use **Loki** for logs and **Prometheus** for `payments.operations` and
`payments.operation.duration` (milliseconds), labeled by operation and outcome.

The pinned Effect 4 package's native OTLP implementation exports JSON over HTTP to `/v1/traces`, `/v1/logs`,
and `/v1/metrics`. No separate OpenTelemetry SDK is required. Browser payout calls propagate W3C `traceparent`
to the app server, joining wallet actions and server authorization/proof spans in one trace. Independent requests
and later reconciliations have separate traces; join those by payment hash/group/participant ID.

The browser endpoint is public configuration and must accept browser CORS (the provided development image does).
Keep collector credentials out of `VITE_` variables. Without endpoints, local logging remains active and no OTLP
requests are sent. Collector outages do not retry or fail payments. Export is batched; sudden process termination
can lose the last batch. HMR disposes the old runtime and flushes its exporters.

## Follow a payment

1. **Invoice:** `funding.invoice` → `receiver.ark-info` → `receiver.invoice-for-address` →
   `receiver.invoice.created` → `contribution.persisted`. `contribution.reused` identifies an existing attempt.
2. **Offline delivery:** inspect Barkd's log while Alice's browser is closed. Reopen and refresh contributions:
   `receiver.receipt` reports `awaiting-payment`, `htlcs-ready`, `preimage-revealed`, `delivering`, or `settled`;
   `contribution.reconciled` records the stored transition. Paid is not necessarily delivered.
3. **Wallet:** `wallet.lock.waiting/acquired` → `wallet.open` → `wallet.sync` → `wallet.synced`.
   A long gap before acquisition indicates another tab is using the wallet.
4. **Fees:** `payout.balance.checked` records `requiredSats` and `spendableSats`. A shortfall needs a fee reserve.
5. **LNURL:** `lnurl.http` records only the host, `lnurl.http.response` the HTTP status, and `lnurl.limits` the
   service's millisatoshi limits. No response plus `TypeError` commonly means network/CORS; inspect the browser's
   Network panel. `lnurl.invoice.validate` identifies invoice validation failures; `lnurl.invoice.validated` confirms
   mainnet network, amount, and expiry validation. Metadata/description hash equality is not required by current LUD-06.
6. **Payout:** `payout.claimed` distinguishes a new send from reconciliation; `wallet.lightning.send` or
   `wallet.lightning.reconcile` reports the wallet result. `payout.proof.verified` and `payout.confirmed` record
   completion. Native Ark/BOLT12 sends use `wallet.native.send/reconcile`.
7. **Finish:** `settlement.completed`, or `settlement.incomplete` with `allPaid` and `hasExcess`.

An uncertain `sending` attempt must be reconciled, not blindly resent. Instrumentation adds no payment retries.
For BOLT12, `FetchBolt12Invoice` can fail before Bark starts a payment. Under the wallet lock, reconciliation checks
that history still ends at the recorded pre-send boundary and `pendingLightningSends()` is empty. Only then can
`payout.unstarted.released` expire that attempt and enable changing its address or explicitly retrying. Changed or
missing history, pending checkpoints, and paid attempts are not released. This uses the organizer's browser-held
wallet evidence, the same trust boundary as native payout proofs. Recovery itself never sends a payment.
It never logs full invoices, LNURLs, preimages, mnemonics, cookies, or bearer tokens. Wallet references are SHA-256
hashes. Exported exception contents and SQL attributes are redacted; error categories and the failing span identify
the stage without exporting SDK response bodies or database bindings.

Stop the viewer with `docker compose -f dev/observability/compose.yaml down`; its named volume keeps collected data.
