/** Called under the wallet lock, after the send call has returned or on reconciliation.
 * Bark 0.7.1 persists a Lightning action checkpoint before driving a send, and completed
 * sends remain in history. Require BOTH unchanged history and no pending checkpoints.
 */
export function canReleaseBolt12Claim(
  payout: { readonly method: string; readonly status: string; readonly historyStartId: number | null },
  history: readonly { readonly id: number }[],
  pendingSendCount: number,
): boolean {
  return (
    payout.method === "bolt12" &&
    payout.status === "sending" &&
    payout.historyStartId !== null &&
    pendingSendCount === 0 &&
    Math.max(0, ...history.map((entry) => entry.id)) === payout.historyStartId
  );
}
