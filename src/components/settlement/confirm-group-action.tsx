import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import type { ReactNode } from "react";

export function ConfirmGroupAction({
  label,
  description,
  disabled,
  pending,
  onConfirm,
}: Readonly<{
  label: string;
  description: string;
  disabled: boolean;
  pending: boolean;
  onConfirm: () => void;
}>): ReactNode {
  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button disabled={disabled || pending} />}>
        {pending ? "Working…" : label}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{label}?</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <AlertDialogAction disabled={pending} onClick={onConfirm}>
            Confirm {label.toLocaleLowerCase("en-US")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
