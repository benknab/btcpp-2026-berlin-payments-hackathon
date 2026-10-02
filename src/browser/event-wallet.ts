import init, { generateMnemonic, Wallet } from "@secondts/bark/web";
import type { Config } from "@secondts/bark/web";
import wasmUrl from "@secondts/bark/web/bark_ffi_wasm_bg.wasm?url";

import { findWallet, readWallet, saveWallet } from "./wallet-storage";
import type { EventWalletRecord } from "./wallet-storage";

const config: Config = {
  serverAddress: "https://ark.second.tech",
  esploraAddress: "https://mempool.second.tech/api",
};
let initialization: Promise<unknown> | null = null;

async function initialize(): Promise<void> {
  if (!globalThis.isSecureContext) {
    throw new Error("Bark requires HTTPS or localhost.");
  }
  initialization ??= init({ module_or_path: wasmUrl }).catch((error: unknown) => {
    initialization = null;
    throw error;
  });
  await initialization;
}

async function openWallet(record: EventWalletRecord, createIfNotExists: boolean): Promise<Wallet> {
  await initialize();
  return Wallet.open("Bitcoin", record.mnemonic, config, undefined, {
    indexedDbName: record.dbName,
    createIfNotExists,
    runDaemon: false,
  });
}

export async function createEventWallet(id: string): Promise<string> {
  await initialize();
  const record = prepareWallet(id);
  if (record.arkAddress !== null) {
    return record.arkAddress;
  }
  const wallet = await openWallet(record, true);
  try {
    const arkAddress = await wallet.newAddress();
    saveWallet(id, { ...record, arkAddress });
    return arkAddress;
  } finally {
    wallet.free();
  }
}

function prepareWallet(id: string): EventWalletRecord {
  const record = readWallet(id) ?? {
    dbName: `bark-mainnet-event-${id}`,
    mnemonic: generateMnemonic(),
    arkAddress: null,
  };
  // Persist the seed before creating the IndexedDB wallet or publishing its address.
  saveWallet(id, record);
  return record;
}

export function openEventWallet(arkAddress: string): Promise<Wallet> {
  const record = findWallet(arkAddress);
  if (record === null) {
    return Promise.reject(new Error("This event's wallet is not stored in this browser."));
  }
  return openWallet(record, false);
}
