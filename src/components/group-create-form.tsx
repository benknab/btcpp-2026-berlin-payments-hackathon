import { ActionError } from "@/components/action-error";
import { GroupNameField } from "@/components/group-name-field";
import { GroupPeopleFields } from "@/components/group-people-fields";
import { LabeledField } from "@/components/labeled-field";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useGroupCreate } from "@/components/use-group-create";
import type { ReactNode } from "react";

export function GroupCreateForm(): ReactNode {
  const form = useGroupCreate();
  return (
    <form onSubmit={form.handleSubmit} className="flex flex-col gap-6">
      <FieldGroup>
        <GroupNameField
          name={form.name}
          pending={form.pending}
          onChange={(value) => {
            form.setName(value);
          }}
        />
        <GroupPeopleFields
          organizerName={form.organizerName}
          people={form.people}
          pending={form.pending}
          setOrganizerName={form.setOrganizerName}
          addPerson={form.addPerson}
          changePerson={form.changePerson}
          removePerson={form.removePerson}
        />
        <LabeledField id="owner-destination" label="Receiving address">
          <Input
            id="owner-destination"
            required
            value={form.organizerLnurl}
            disabled={form.pending}
            onChange={(event) => {
              form.setOrganizerLnurl(event.target.value);
            }}
          />
        </LabeledField>
      </FieldGroup>
      <ActionError message={form.error} />
      <Button type="submit" size="lg" className="w-full sm:w-auto sm:self-start" disabled={form.pending}>
        {form.pending ? "Creating…" : "Create event"}
      </Button>
      <p className="text-xs text-muted-foreground">
        You’re the organizer. Keep this browser’s cookies to retain organizer access.
      </p>
    </form>
  );
}
