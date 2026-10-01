import { NoteField } from "@/components/note-field";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { createNote } from "@/server/notes";
import { useRouter } from "@tanstack/react-router";
import { useState } from "react";
import type { ReactNode, SubmitEvent } from "react";

export function NoteForm(): ReactNode {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function submit(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault();
    setPending(true);
    setError(null);
    createNote({ data: { body: body.trim() } })
      .then(async (): Promise<void> => {
        setBody("");
        await router.invalidate();
      })
      .catch((): void => {
        setError("Could not save the note. Please try again.");
      })
      .finally((): void => {
        setPending(false);
      });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-6">
      <NoteField body={body} pending={pending} onChange={setBody} />
      <Button type="submit" className="self-start" disabled={pending || body.trim().length === 0}>
        {pending ? "Saving…" : "Save note"}
      </Button>
      {error === null ? null : (
        <Alert variant="destructive">
          <AlertTitle>Unable to save</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </form>
  );
}
