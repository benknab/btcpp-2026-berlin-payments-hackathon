import { saveEventId } from "@/browser/saved-events";
import { EventNavigation } from "@/components/event-navigation";
import { GroupUnavailable } from "@/components/group-unavailable";
import { PageShell } from "@/components/page-shell";
import { ParticipantChooser } from "@/components/participant-chooser";
import { Badge } from "@/components/ui/badge";
import { groupPage } from "@/server/groups";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { UsersIcon } from "lucide-react";
import { useEffect } from "react";
import type { ReactNode } from "react";

export const Route = createFileRoute("/groups/$inviteKey")({
  loader: ({ params }): ReturnType<typeof groupPage> => groupPage({ data: { inviteKey: params.inviteKey } }),
  component: GroupLayout,
  errorComponent: GroupUnavailable,
});

const STATUS_LABELS = { open: "Open", settling: "Settling up", settled: "Settled" };

function GroupLayout(): ReactNode {
  const view = Route.useLoaderData();
  const { inviteKey } = Route.useParams();
  const selected = view.participants.find((participant) => participant.id === view.selectedParticipantId);
  useEffect(() => {
    if (view.selectedParticipantId !== null) {
      saveEventId(inviteKey);
    }
  }, [inviteKey, view.selectedParticipantId]);

  return (
    <PageShell>
      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h1 className="min-w-0 font-heading text-4xl font-medium tracking-tight break-words">{view.group.name}</h1>
          <Badge variant={view.group.status === "open" ? "secondary" : "outline"}>
            {STATUS_LABELS[view.group.status]}
          </Badge>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <UsersIcon className="size-4" strokeWidth={1.5} aria-hidden="true" />
            {view.participants.length} participants
          </span>
          {selected !== undefined && (
            <span>
              You: {selected.name}
              {view.isOrganizer ? " · Owner" : ""}
            </span>
          )}
        </div>
      </section>
      {selected === undefined ? (
        <ParticipantChooser inviteKey={inviteKey} participants={view.participants} />
      ) : (
        <>
          <EventNavigation inviteKey={inviteKey} />
          <Outlet />
        </>
      )}
    </PageShell>
  );
}
