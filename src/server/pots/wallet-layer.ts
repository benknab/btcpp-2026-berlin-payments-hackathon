import { barkLayer } from "@/server/bark/sdk";
import { Effect } from "effect";

import { UiPotConfig } from "./ui-config";

export const configuredWallet = Effect.gen(function* configuredWallet() {
  return barkLayer(yield* UiPotConfig);
});
