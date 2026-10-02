import { ActionError } from "@/components/action-error";
import { GroupPeopleFields } from "@/components/group-people-fields";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { GroupNameField } from "@/components/group-name-field";
import { useGroupCreate } from "@/components/use-group-create";
import type { ReactNode } from "react";

export function GroupCreateForm(): ReactNode {
  const form = useGroupCreate();
  return (
    <form onSubmit={form.handleSubmit} className="flex flex-col gap-6">
      <FieldGroup>
        <GroupNameField name={form.name} pending={form.pending} onChange={form.setName} />
        <GroupPeopleFields
          organizerName={form.organizerName}
          people={form.people}
          pending={form.pending}
          setOrganizerName={form.setOrganizerName}
          addPerson={form.addPerson}
          changePerson={form.changePerson}
          removePerson={form.removePerson}
        />
      </FieldGroup>
      <ActionError message={form.error} />
      <Button type="submit" size="lg" className="w-full sm:w-auto sm:self-start" disabled={form.pending}>
        {form.pending ? "Creating your group…" : "Create group"}
      </Button>
      <p className="text-xs text-muted-foreground">
        You’re the organizer. Keep this browser’s cookies to retain organizer access.
      </p>
    </form>
  );
}
