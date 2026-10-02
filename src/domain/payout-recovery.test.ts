import { describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";

import { canReleaseBolt12Claim } from "./payout-recovery";

const payout = { method: "bolt12", status: "sending", historyStartId: 2 };

describe("unstarted BOLT12 recovery", () => {
  it.effect("allows recovery only when the history boundary is intact and no send checkpoint exists", () =>
    Effect.sync(() => {
      expect(canReleaseBolt12Claim(payout, [{ id: 2 }, { id: 1 }], 0)).toBe(true);
      expect(canReleaseBolt12Claim(payout, [{ id: 2 }, { id: 1 }], 1)).toBe(false);
      expect(canReleaseBolt12Claim(payout, [{ id: 3 }, { id: 2 }], 0)).toBe(false);
      expect(canReleaseBolt12Claim(payout, [{ id: 1 }], 0)).toBe(false);
      expect(canReleaseBolt12Claim(payout, [], 0)).toBe(false);
      expect(canReleaseBolt12Claim({ ...payout, historyStartId: null }, [], 0)).toBe(false);
      expect(canReleaseBolt12Claim({ ...payout, method: "ark" }, [{ id: 2 }], 0)).toBe(false);
      expect(canReleaseBolt12Claim({ ...payout, method: "bolt11" }, [{ id: 2 }], 0)).toBe(false);
      expect(canReleaseBolt12Claim({ ...payout, status: "paid" }, [{ id: 2 }], 0)).toBe(false);
      expect(canReleaseBolt12Claim({ ...payout, status: "prepared" }, [{ id: 2 }], 0)).toBe(false);
    }),
  );
});
