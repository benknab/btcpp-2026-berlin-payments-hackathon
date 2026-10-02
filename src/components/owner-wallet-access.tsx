import type { ReactNode } from "react";

import { ActionError } from "./action-error";
import { RecoveryPhraseForm } from "./recovery-phrase-form";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { useOwnerWalletAccess } from "./use-owner-wallet-access";
import type { OwnerWalletAccessProps } from "./use-owner-wallet-access";

export function OwnerWalletAccess(props: OwnerWalletAccessProps): ReactNode {
  const wallet = useOwnerWalletAccess(props);
  const backup = wallet.mode === "backup";
  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="self-start"
        disabled={wallet.pending}
        onClick={() => {
          wallet.openDialog();
        }}
      >
        {props.isOrganizer ? "Recovery phrase" : "I'm the owner"}
      </Button>
      {wallet.mode === null && <ActionError message={wallet.error} />}
      <Dialog
        open={wallet.mode !== null}
        onOpenChange={(open) => {
          if (!open) {
            wallet.closeDialog();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{backup ? "Recovery phrase" : "Restore owner wallet"}</DialogTitle>
            <DialogDescription>
              {backup
                ? "Keep these words somewhere safe. Anyone with them can spend this wallet's funds."
                : "Enter this event wallet's recovery phrase. Recovery requires the Ark server."}
            </DialogDescription>
          </DialogHeader>
          <RecoveryPhraseForm
            backup={backup}
            phrase={wallet.phrase}
            pending={wallet.pending}
            error={wallet.error}
            onChange={(phrase) => {
              wallet.setPhrase(phrase);
            }}
            onRestore={() => {
              wallet.restore();
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
