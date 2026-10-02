import { useAction } from "@/components/use-action";
import { participantLink } from "@/server/participant-payments";
import { useState } from "react";

export function useParticipantLink(
  inviteKey: string,
  participantId: string,
  origin: string,
): {
  readonly accessKey: string | null;
  readonly copied: boolean;
  readonly pending: boolean;
  readonly error: string | null;
  readonly handleGenerate: () => void;
  readonly handleCopy: () => void;
} {
  const [accessKey, setAccessKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const action = useAction();
  function handleGenerate(): void {
    action.run(async () => {
      const result = await participantLink({ data: { inviteKey, participantId } });
      setAccessKey(result.accessKey);
      setCopied(false);
    }, "Could not create the private link. Check organizer access and settlement status.");
  }
  function handleCopy(): void {
    if (accessKey === null) {
      return;
    }
    action.run(async () => {
      await navigator.clipboard.writeText(`${origin}/participants/${accessKey}`);
      setCopied(true);
    }, "Could not copy the private link.");
  }
  return { accessKey, copied, pending: action.pending, error: action.error, handleGenerate, handleCopy };
}
