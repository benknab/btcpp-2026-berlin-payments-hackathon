import { GroupUnavailable } from "@/components/group-unavailable";
import { PageShell } from "@/components/page-shell";
import { ParticipantChooser } from "@/components/participant-chooser";
import { Button } from "@/components/ui/button";
import { groupPage } from "@/server/groups";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useState } from "react";
import type { ReactNode } from "react";

export const Route = createFileRoute("/groups/$inviteKey")({
  loader: ({ params }): ReturnType<typeof groupPage> => groupPage({ data: { inviteKey: params.inviteKey } }),
  component: GroupLayout,
  errorComponent: GroupUnavailable,
});

function GroupLayout(): ReactNode {
  const view = Route.useLoaderData();
  const { inviteKey } = Route.useParams();
  const [choosing, setChoosing] = useState(false);
  const selected = view.participants.find((participant) => participant.id === view.selectedParticipantId);

  return (
    <PageShell>
      <section className="flex flex-col gap-3">
        <h1 className="text-3xl font-semibold tracking-tight text-balance">{view.group.name}</h1>
        {selected !== undefined && (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">{selected.name}</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setChoosing(true);
              }}
            >
              Switch person
            </Button>
          </div>
        )}
      </section>
      {selected === undefined || choosing ? (
        <ParticipantChooser
          inviteKey={inviteKey}
          participants={view.participants}
          onChosen={() => {
            setChoosing(false);
          }}
        />
      ) : (
        <Outlet />
      )}
    </PageShell>
  );
}
