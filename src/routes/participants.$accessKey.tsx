import { GroupUnavailable } from "@/components/group-unavailable";
import { PageShell } from "@/components/page-shell";
import { PersonalAddressForm } from "@/components/settlement/personal-address-form";
import { PersonalPaymentStatus } from "@/components/settlement/personal-payment-status";
import { personalAddressPage } from "@/server/participant-payments";
import { createFileRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";

export const Route = createFileRoute("/participants/$accessKey")({
  loader: ({ params }): ReturnType<typeof personalAddressPage> =>
    personalAddressPage({ data: { accessKey: params.accessKey } }),
  head: () => ({
    meta: [
      { name: "referrer", content: "no-referrer" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: PersonalAddressPage,
  errorComponent: GroupUnavailable,
});

function PersonalAddressPage(): ReactNode {
  const profile = Route.useLoaderData();
  const { accessKey } = Route.useParams();
  return (
    <PageShell>
      <h1 className="text-3xl font-semibold tracking-tight">{profile.groupName}</h1>
      <PersonalPaymentStatus status={profile.status} payment={profile.payment} />
      <PersonalAddressForm
        key={profile.participantId}
        personalKey={accessKey}
        name={profile.name}
        arkAddress={profile.arkAddress}
        locked={profile.status !== "open"}
      />
    </PageShell>
  );
}
