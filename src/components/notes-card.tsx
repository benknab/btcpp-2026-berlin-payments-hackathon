import { NoteForm } from "@/components/note-form";
import { NoteList } from "@/components/note-list";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import type { Note } from "@/db/schema";
import type { ReactNode } from "react";

export function NotesCard({ notes }: Readonly<{ notes: readonly Note[] }>): ReactNode {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Your first database-backed feature</CardTitle>
        <CardDescription>Add a note to verify the full stack is working.</CardDescription>
      </CardHeader>
      <CardContent>
        <NoteForm />
      </CardContent>
      <CardFooter>
        <NoteList notes={notes} />
      </CardFooter>
    </Card>
  );
}
