import { ActionError } from "@/components/action-error";
import { GroupPeopleFields } from "@/components/group-people-fields";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useGroupCreate } from "@/components/use-group-create";
import { MAX_GROUP_NAME } from "@/domain/group-input";
import type { ReactNode } from "react";

export function GroupCreateForm(): ReactNode {
  const form = useGroupCreate();
  return (
    <form onSubmit={form.handleSubmit} className="flex flex-col gap-6">
      <FieldGroup>
        <Field data-disabled={form.pending}>
          <FieldLabel htmlFor="group-name">What are we splitting?</FieldLabel>
          <Input
            id="group-name"
            placeholder="Berlin weekend"
            value={form.name}
            required
            maxLength={MAX_GROUP_NAME}
            disabled={form.pending}
            onChange={(event) => {
              form.setName(event.target.value);
            }}
          />
          <FieldDescription>A trip, a dinner, or whatever brings you together.</FieldDescription>
        </Field>
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
