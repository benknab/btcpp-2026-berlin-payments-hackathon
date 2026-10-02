import { AlertDialog, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import type { ReactNode } from "react";

import { ConfirmGroupContent } from "./confirm-group-content";
import type { ConfirmGroupContentProps } from "./confirm-group-content";

export function ConfirmGroupAction({
  label,
  description,
  disabled,
  pending,
  onConfirm,
}: ConfirmGroupContentProps & { readonly disabled: boolean }): ReactNode {
  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button disabled={disabled || pending} />}>
        {pending ? "Working…" : label}
      </AlertDialogTrigger>
      <ConfirmGroupContent label={label} description={description} pending={pending} onConfirm={onConfirm} />
    </AlertDialog>
  );
}
