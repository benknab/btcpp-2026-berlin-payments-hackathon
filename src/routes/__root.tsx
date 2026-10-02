import { DemoPresetMenu } from "@/components/demo-preset-menu";
import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import type { ReactNode } from "react";

import stylesheet from "@/styles.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Splitbark" },
      { name: "description", content: "Kittysplit + Bark" },
    ],
    links: [{ rel: "stylesheet", href: stylesheet }],
  }),
  component: Root,
  notFoundComponent: (): ReactNode => (
    <main>
      <h1>Page not found</h1>
      <a href="/">Go home</a>
    </main>
  ),
});

function Root(): ReactNode {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <Outlet />
        <DemoPresetMenu />
        <Scripts />
      </body>
    </html>
  );
}
