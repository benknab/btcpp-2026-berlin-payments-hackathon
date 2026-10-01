// @vitest-environment happy-dom
import { PayoutPanel } from "@/components/settlement/payout-panel";
import { SettlementScreen } from "@/components/settlement/settlement-screen";
import { SettlementSetupForm } from "@/components/settlement/setup-form";
import type { Pot, PotParticipant } from "@/lib/pot";
import type { SettlementSetupInput } from "@/lib/settlement";
import { createSettlement, openSettlement, paySettlement, refreshSettlement } from "@/server/settlement";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

vi.mock("@/server/settlement", () => ({
  createSettlement: vi.fn(),
  openSettlement: vi.fn(),
  paySettlement: vi.fn(),
  refreshSettlement: vi.fn(),
}));

afterEach(cleanup);

const pot: Pot = {
  id: "test-pot",
  walletFingerprint: "wallet",
  revision: 0,
  status: "collecting",
  totalSat: 9000,
  participants: [
    {
      userId: "alice",
      name: "Alice",
      payoutAddress: "tark1ace",
      depositAddress: "tark1depositace",
      payInSat: 9000,
      receiveSat: 0,
      receivedSat: 0,
      receiptMovementIds: [],
      payoutStatus: "not-needed",
      payoutHistoryCursor: 0,
      payoutMovementId: null,
    },
    {
      userId: "bob",
      name: "Bob",
      payoutAddress: "tark1q0q",
      depositAddress: "tark1depositq0q",
      payInSat: 0,
      receiveSat: 9000,
      receivedSat: 0,
      receiptMovementIds: [],
      payoutStatus: "pending",
      payoutHistoryCursor: 0,
      payoutMovementId: null,
    },
  ],
};
const funded: Pot = {
  ...pot,
  revision: 1,
  participants: pot.participants.map((participant) => ({ ...participant, receivedSat: participant.payInSat })),
};

async function fillSetup(user: ReturnType<typeof userEvent.setup>): Promise<void> {
  await user.type(screen.getByLabelText("Payout address for Alice"), "tark1ace");
  await user.type(screen.getByLabelText("Payout address for Bob"), "tark1q0q");
  await user.type(screen.getByLabelText("Amount (sats)"), "9000");
}

function paidParticipant(participant: PotParticipant): PotParticipant {
  return {
    ...participant,
    payoutStatus: participant.receiveSat > 0 ? "paid" : "not-needed",
    payoutMovementId: participant.receiveSat > 0 ? 3 : null,
  };
}

describe("final settlement UI", (): void => {
  it("resumes a saved pot and blocks an interrupted payout until a refresh", async (): Promise<void> => {
    const user = userEvent.setup();
    vi.mocked(openSettlement).mockResolvedValue({ ok: true, pot: funded });
    vi.mocked(paySettlement).mockRejectedValue(new Error("Lost HTTP response"));
    vi.mocked(refreshSettlement).mockResolvedValue({ ok: true, pot: { ...funded, status: "paying" } });
    render(<SettlementScreen />);
    await user.type(screen.getByLabelText("Operator access code"), "operator-code");
    await user.click(screen.getByRole("button", { name: "Connect / resume pot" }));
    await screen.findByLabelText("Pot deposit address for Alice");
    expect(screen.queryByRole("button", { name: "Add debt" })).toBeNull();
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: "Pay out 9,000 sats" }));
    await screen.findByText(
      "Request interrupted. Refresh the pot before proceeding; a payout may already have completed.",
    );
    expect(screen.getByRole("button", { name: "Pay out 9,000 sats" }).hasAttribute("disabled")).toBe(true);
    expect(screen.getByRole("checkbox").getAttribute("aria-disabled")).toBe("true");
    await user.click(screen.getByRole("button", { name: "Check deposits / refresh" }));
    await screen.findByRole("button", { name: "Reconcile / finish payouts" });
    expect(screen.getByRole("button", { name: "Reconcile / finish payouts" }).hasAttribute("disabled")).toBe(true);
    expect(vi.mocked(paySettlement)).toHaveBeenCalledTimes(1);
  });

  it("builds a debt/address setup and submits the locked payload", async (): Promise<void> => {
    const user = userEvent.setup();
    const create = vi.fn<(setup: SettlementSetupInput) => void>();
    render(<SettlementSetupForm pending={false} onCreate={create} />);
    await fillSetup(user);
    await user.click(screen.getByRole("button", { name: "Lock details & create pot" }));
    expect(create).toHaveBeenCalledExactlyOnceWith({
      users: [
        { id: "alice", name: "Alice", arkAddress: "tark1ace" },
        { id: "bob", name: "Bob", arkAddress: "tark1q0q" },
      ],
      debts: [{ from: "alice", to: "bob", amountSat: 9000 }],
    });
  });

  it("rejects self-debts and marks the party controls invalid", async (): Promise<void> => {
    const user = userEvent.setup();
    const create = vi.fn<(setup: SettlementSetupInput) => void>();
    render(<SettlementSetupForm pending={false} onCreate={create} />);
    await fillSetup(user);
    await user.selectOptions(screen.getByLabelText("Owes whom"), "alice");
    await user.click(screen.getByRole("button", { name: "Lock details & create pot" }));
    expect(create).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Who owes").getAttribute("aria-invalid")).toBe("true");
    expect(screen.getByText("Check the settlement inputs")).toBeTruthy();
  });

  it("requires confirmed deposits and an explicit review before enabling payout", async (): Promise<void> => {
    const user = userEvent.setup();
    const pay = vi.fn<() => void>();
    const refresh = vi.fn<() => void>();
    const view = render(<PayoutPanel pot={pot} pending={false} needsRefresh={false} onPay={pay} onRefresh={refresh} />);
    expect(screen.getByRole("button", { name: "Pay out 9,000 sats" }).hasAttribute("disabled")).toBe(true);
    expect(screen.getByRole("checkbox").getAttribute("aria-disabled")).toBe("true");
    view.rerender(<PayoutPanel pot={funded} pending={false} needsRefresh={false} onPay={pay} onRefresh={refresh} />);
    expect(screen.getByRole("button", { name: "Pay out 9,000 sats" }).hasAttribute("disabled")).toBe(true);
    await user.click(screen.getByRole("checkbox"));
    expect(screen.getByRole("button", { name: "Pay out 9,000 sats" }).hasAttribute("disabled")).toBe(false);
    await user.click(screen.getByRole("button", { name: "Pay out 9,000 sats" }));
    expect(pay).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Pay out 9,000 sats" }).hasAttribute("disabled")).toBe(true);
    view.rerender(<PayoutPanel pot={funded} pending={false} needsRefresh onPay={pay} onRefresh={refresh} />);
    expect(screen.getByRole("checkbox").getAttribute("aria-disabled")).toBe("true");
  });

  it("connects, creates, checks deposits, and pays without submitting editable destinations", async (): Promise<void> => {
    const user = userEvent.setup();
    const code = "operator-access-code";
    vi.mocked(openSettlement).mockResolvedValue({ ok: true, pot: null });
    vi.mocked(createSettlement).mockResolvedValue({ ok: true, pot });
    vi.mocked(refreshSettlement).mockResolvedValue({ ok: true, pot: funded });
    vi.mocked(paySettlement).mockResolvedValue({
      ok: true,
      pot: {
        ...funded,
        status: "settled",
        participants: funded.participants.map(paidParticipant),
      },
    });
    render(<SettlementScreen />);
    await user.type(screen.getByLabelText("Operator access code"), code);
    await user.click(screen.getByRole("button", { name: "Connect / resume pot" }));
    await screen.findByText("1. Set up the final settlement");
    await fillSetup(user);
    await user.click(screen.getByRole("button", { name: "Lock details & create pot" }));
    await screen.findByLabelText("Pot deposit address for Alice");
    expect(screen.queryByRole("button", { name: "Add debt" })).toBeNull();
    expect(screen.getByRole("button", { name: "Pay out 9,000 sats" }).hasAttribute("disabled")).toBe(true);
    await user.click(screen.getByRole("button", { name: "Check deposits / refresh" }));
    await waitFor((): void => {
      expect(screen.getByRole("checkbox").getAttribute("aria-disabled")).not.toBe("true");
    });
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: "Pay out 9,000 sats" }));
    await screen.findByText("3. Settlement complete");
    expect(vi.mocked(paySettlement)).toHaveBeenCalledExactlyOnceWith({
      data: { accessCode: code, id: pot.id, reviewed: true },
    });
    expect(screen.queryByRole("button", { name: "Pay out 9,000 sats" })).toBeNull();
  });
});
