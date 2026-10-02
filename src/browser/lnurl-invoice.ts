import { lnurlEndpoint } from "@/domain/lnurl";
import { validateLnurlInvoice } from "@/domain/lnurl-pay";
import { PaymentError } from "@/domain/payment-error";
import { Schema } from "effect";

import type { BrowserTrace } from "./telemetry";

const REQUEST_TIMEOUT_MS = 30_000;
const MSATS_PER_SAT = 1000;
const PayRequest = Schema.Struct({
  tag: Schema.Literal("payRequest"),
  callback: Schema.String,
  minSendable: Schema.Number,
  maxSendable: Schema.Number,
  metadata: Schema.String,
});
const InvoiceResponse = Schema.Struct({ pr: Schema.String });

function decodeResponse<Value>(schema: Schema.ConstraintDecoder<Value>, value: unknown): Value {
  try {
    return Schema.decodeUnknownSync(schema)(value);
  } catch {
    throw new PaymentError("lnurlResponseInvalid");
  }
}

async function getJson(url: string, trace: BrowserTrace): Promise<unknown> {
  const endpoint = new URL(url);
  if (endpoint.protocol !== "https:" || endpoint.username !== "" || endpoint.password !== "" || endpoint.hash !== "") {
    throw new PaymentError("lnurlHttpsRequired");
  }
  const response = await trace.step("lnurl.http", { host: endpoint.hostname }, () =>
    fetch(endpoint, {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      credentials: "omit",
      redirect: "error",
    }),
  );
  await trace.log("lnurl.http.response", { host: endpoint.hostname, httpStatus: response.status });
  if (!response.ok) {
    throw new PaymentError("lnurlUnavailable");
  }
  return response.json();
}

async function receivingService(lnurl: string, trace: BrowserTrace): Promise<typeof PayRequest.Type> {
  const endpoint = lnurlEndpoint(lnurl);
  if (endpoint === null) {
    throw new PaymentError("lnurlAddressInvalid");
  }
  return decodeResponse(PayRequest, await getJson(endpoint, trace));
}

function callbackUrl(request: typeof PayRequest.Type, amountSats: number): string {
  const amount = BigInt(amountSats) * BigInt(MSATS_PER_SAT);
  if (amount < BigInt(request.minSendable) || amount > BigInt(request.maxSendable)) {
    throw new PaymentError("lnurlAmountUnsupported");
  }
  const callback = new URL(request.callback);
  callback.searchParams.set("amount", amount.toString());
  return callback.href;
}

export async function resolvePayoutInvoice(lnurl: string, amountSats: number, trace: BrowserTrace): Promise<string> {
  const request = await receivingService(lnurl, trace);
  await trace.log("lnurl.limits", {
    amountSats,
    minSendableMsat: request.minSendable,
    maxSendableMsat: request.maxSendable,
  });
  const response = decodeResponse(InvoiceResponse, await getJson(callbackUrl(request, amountSats), trace));
  const now = Date.now();
  const details = await trace.step("lnurl.invoice.validate", { amountSats }, () =>
    Promise.resolve(validateLnurlInvoice(response.pr, amountSats, now)),
  );
  await trace.log("lnurl.invoice.validated", {
    paymentHash: details.paymentHash,
    amountSats,
    expiresAt: details.expiresAt,
  });
  return response.pr;
}
