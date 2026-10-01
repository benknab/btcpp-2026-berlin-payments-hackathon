import { createRouter } from "@tanstack/react-router";
import type { Router } from "@tanstack/react-router";

import { routeTree } from "./routeTree.gen";

export function getRouter(): Router<typeof routeTree> {
  return createRouter({ routeTree, scrollRestoration: true, defaultPreload: "intent" });
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
