import { withdrawWalletMax } from "@/browser/wallet-withdrawal";
import { readWithdrawal } from "@/browser/withdrawal-storage";
import type { WalletWithdrawal } from "@/domain/withdrawal";
import { useEffect, useState } from "react";

import { useAction } from "./use-action";

export function useWalletWithdrawal(input: {
  readonly inviteKey: string;
  readonly arkAddress: string;
  readonly ownerAddress: string;
  readonly onComplete: () => void;
}): {
  readonly destination: string;
  readonly setDestination: (value: string) => void;
  readonly withdrawal: WalletWithdrawal | null;
  readonly pending: boolean;
  readonly error: string | null;
  readonly withdraw: () => void;
} {
  const [destination, setDestination] = useState(input.ownerAddress);
  const [withdrawal, setWithdrawal] = useState<WalletWithdrawal | null>(null);
  const [storageError, setStorageError] = useState<string | null>(null);
  const action = useAction();
  useEffect(() => {
    let active = true;
    Promise.resolve()
      .then(() => readWithdrawal(input.arkAddress))
      .then((record) => {
        if (active) {
          setWithdrawal(record);
          setStorageError(null);
        }
      })
      .catch(() => {
        if (active) {
          setStorageError("Could not read withdrawal history.");
        }
      });
    return (): void => {
      active = false;
    };
  }, [input.arkAddress]);
  function withdraw(): void {
    action.run(async () => {
      await withdrawWalletMax(input.inviteKey, input.arkAddress, destination).finally(() => {
        setWithdrawal(readWithdrawal(input.arkAddress));
        input.onComplete();
      });
    }, "Could not withdraw. Check settlement, the receiving service, and wallet balance.");
  }
  return {
    destination,
    setDestination,
    withdrawal,
    pending: action.pending,
    error: storageError ?? action.error,
    withdraw,
  };
}
