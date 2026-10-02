import { findWallet } from "@/browser/wallet-storage";
import { recoverEventOwner } from "@/server/groups";
import { useRouter } from "@tanstack/react-router";
import { useState } from "react";

import { useAction } from "./use-action";

export interface OwnerWalletAccessProps {
  readonly groupId: string;
  readonly inviteKey: string;
  readonly arkAddress: string;
  readonly isOrganizer: boolean;
  readonly onRecovered: () => void;
}

async function restoreBrowserWallet(props: OwnerWalletAccessProps, phrase: string): Promise<void> {
  const { restoreEventWallet } = await import("@/browser/event-wallet");
  await restoreEventWallet(props.groupId, props.arkAddress, phrase);
  await recoverEventOwner({ data: { inviteKey: props.inviteKey } });
}

export function useOwnerWalletAccess(props: OwnerWalletAccessProps): {
  readonly mode: "backup" | "restore" | null;
  readonly phrase: string;
  readonly pending: boolean;
  readonly error: string | null;
  readonly setPhrase: (phrase: string) => void;
  readonly openDialog: () => void;
  readonly closeDialog: () => void;
  readonly restore: () => void;
} {
  const [mode, setMode] = useState<"backup" | "restore" | null>(null);
  const [phrase, setPhrase] = useState("");
  const action = useAction();
  const router = useRouter();
  function openDialog(): void {
    action.run(
      () =>
        Promise.resolve().then(() => {
          const record = props.isOrganizer ? findWallet(props.arkAddress) : null;
          setPhrase(record?.mnemonic ?? "");
          setMode(record === null ? "restore" : "backup");
        }),
      "Could not load the recovery phrase from this browser.",
    );
  }
  function closeDialog(): void {
    if (!action.pending) {
      setMode(null);
      setPhrase("");
    }
  }
  function restore(): void {
    action.run(async () => {
      await restoreBrowserWallet(props, phrase);
      setPhrase("");
      setMode(null);
      await router.invalidate();
      props.onRecovered();
    }, "Could not restore the wallet. Check your recovery phrase and connection.");
  }
  return { mode, phrase, pending: action.pending, error: action.error, setPhrase, openDialog, closeDialog, restore };
}
