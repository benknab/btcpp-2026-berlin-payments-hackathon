import {
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { ReactNode } from "react";

export interface ConfirmGroupContentProps {
  readonly label: string;
  readonly description: string;
  readonly pending: boolean;
  readonly onConfirm: () => void;
}

export function ConfirmGroupContent({ label, description, pending, onConfirm }: ConfirmGroupContentProps): ReactNode {
  return (
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
  );
}
