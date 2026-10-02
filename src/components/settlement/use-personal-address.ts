import { useEventAction } from "@/components/use-event-action";
import { setPersonalAddress } from "@/server/participant-payments";
import { useState } from "react";

export function usePersonalAddress(
  personalKey: string,
  initialAddress: string | null,
): {
  readonly address: string;
  readonly saved: boolean;
  readonly pending: boolean;
  readonly error: string | null;
  readonly handleChange: (value: string) => void;
  readonly handleSubmit: (event: { readonly preventDefault: () => void }) => void;
} {
  const [address, setAddress] = useState(initialAddress ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const action = useEventAction();
  function handleChange(value: string): void {
    setAddress(value);
    setSaved(false);
  }
  function handleSubmit(event: { readonly preventDefault: () => void }): void {
    event.preventDefault();
    action.run(async () => {
      setMessage(null);
      setSaved(false);
      const result = await setPersonalAddress({ data: { accessKey: personalKey, arkAddress: address.trim() } });
      if (result.ok) {
        setSaved(true);
      } else {
        setMessage(result.message);
      }
    }, "Could not save your address. Refresh to check its status.");
  }
  return { address, saved, pending: action.pending, error: message ?? action.error, handleChange, handleSubmit };
}
