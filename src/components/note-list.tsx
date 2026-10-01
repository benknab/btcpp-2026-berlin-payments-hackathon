import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import type { Note } from "@/db/schema";
import type { ReactNode } from "react";

export function NoteList({ notes }: Readonly<{ notes: readonly Note[] }>): ReactNode {
  if (notes.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>No notes yet</EmptyTitle>
          <EmptyDescription>Add the first one above.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <ul className="flex w-full flex-col gap-4" aria-label="Recent notes">
      {notes.map((note): ReactNode => (
        <li key={note.id} className="flex flex-col gap-1">
          <p className="whitespace-pre-wrap">{note.body}</p>
          <small className="text-muted-foreground">{note.createdAt}</small>
        </li>
      ))}
    </ul>
  );
}
