import { parseMainnetInvoice } from "@/domain/bolt11";
import { lnurlEndpoint } from "@/domain/lnurl";
import { hex } from "@scure/base";
import { Schema } from "effect";

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

async function getJson(url: string): Promise<unknown> {
  const endpoint = new URL(url);
  if (endpoint.protocol !== "https:" || endpoint.username !== "" || endpoint.password !== "" || endpoint.hash !== "") {
    throw new Error("The receiving service must use HTTPS.");
  }
  const response = await fetch(endpoint, {
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    credentials: "omit",
    redirect: "error",
  });
  if (!response.ok) {
    throw new Error("The receiving service is unavailable.");
  }
  return response.json();
}

async function metadataHash(metadata: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(metadata));
  return hex.encode(new Uint8Array(digest));
}

async function receivingService(lnurl: string): Promise<typeof PayRequest.Type> {
  const endpoint = lnurlEndpoint(lnurl);
  if (endpoint === null) {
    throw new Error("Invalid receiving address.");
  }
  return Schema.decodeUnknownSync(PayRequest)(await getJson(endpoint));
}

function callbackUrl(request: typeof PayRequest.Type, amountSats: number): string {
  const amount = BigInt(amountSats) * BigInt(MSATS_PER_SAT);
  if (amount < BigInt(request.minSendable) || amount > BigInt(request.maxSendable)) {
    throw new Error("The receiving service does not support this payout amount.");
  }
  const callback = new URL(request.callback);
  callback.searchParams.set("amount", amount.toString());
  return callback.href;
}

export async function resolvePayoutInvoice(lnurl: string, amountSats: number): Promise<string> {
  const request = await receivingService(lnurl);
  const response = Schema.decodeUnknownSync(InvoiceResponse)(await getJson(callbackUrl(request, amountSats)));
  const details = parseMainnetInvoice(response.pr);
  if (
    details.amountSats !== amountSats ||
    details.expiresAt <= Date.now() ||
    details.descriptionHash !== (await metadataHash(request.metadata))
  ) {
    throw new Error("The receiving service returned mismatched or expired invoice details.");
  }
  return response.pr;
}
