import { Schema } from "effect";

const WALLET_PREFIX = "bark:mainnet:event-wallet:";
const StoredWallet = Schema.Struct({
  dbName: Schema.String,
  mnemonic: Schema.String,
  arkAddress: Schema.NullOr(Schema.String),
});
export type EventWalletRecord = typeof StoredWallet.Type;
const decodeWallet = Schema.decodeUnknownSync(Schema.fromJsonString(StoredWallet));

export function readWallet(id: string): EventWalletRecord | null {
  const stored = localStorage.getItem(`${WALLET_PREFIX}${id}`);
  return stored === null ? null : decodeWallet(stored);
}

export function saveWallet(id: string, record: EventWalletRecord): void {
  localStorage.setItem(`${WALLET_PREFIX}${id}`, JSON.stringify(record));
}

export function findWallet(arkAddress: string): EventWalletRecord | null {
  for (const key of Object.keys(localStorage)) {
    if (key.startsWith(WALLET_PREFIX)) {
      const record = readWallet(key.slice(WALLET_PREFIX.length));
      if (record?.arkAddress === arkAddress) {
        return record;
      }
    }
  }
  return null;
}
