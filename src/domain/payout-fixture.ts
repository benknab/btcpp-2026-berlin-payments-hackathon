import { bech32, hex } from "@scure/base";

// Bark's upstream address and BOLT12 offer test vectors.
export const SIGNET_ARK_ADDRESS =
  "tark1pwh9vsmezqqpharv69q4z8m6x364d5m5prnmcalcalq9pdmzw0y7mpveck4pcfhezqypczkrrj3lkx5ue4qrf4jc7ztpt9htdttmh2judhqnu7aue8p0y9mq47jn9z";
export const BOLT12_OFFER =
  "lno1qgsyxjtl6luzd9t3pr62xr7eemp6awnejusgf6gw45q75vcfqqqqqqq2p32x2um5ypmx2cm5dae8x93pqthvwfzadd7jejes8q9lhc4rvjxd022zv5l44g6qah82ru5rdpnpj";

const PAYMENT_HASH_HEX_LENGTH = 64;
const PAYMENT_HASH_WORDS = 20;
export const PREIMAGE = "0".repeat(PAYMENT_HASH_HEX_LENGTH);
export const PAYMENT_HASH = "66687aadf862bd776c8fc18b8e9f8e20089714856ee233b3902a591d0d5f2925";
const WORDS = [
  ...Array.from({ length: 7 }, () => 0),
  1,
  1,
  PAYMENT_HASH_WORDS,
  ...bech32.toWords(hex.decode(PAYMENT_HASH)),
  ...Array.from({ length: 104 }, () => 0),
];
export function signetInvoice(amount = "50"): string {
  return bech32.encode(`lntbs${amount}u`, WORDS, false);
}
export const INVOICE = signetInvoice();
