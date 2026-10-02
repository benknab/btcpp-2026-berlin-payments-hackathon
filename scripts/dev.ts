import { NodeRuntime, NodeServices } from "@effect/platform-node";
import { Effect, Redacted } from "effect";
import { ChildProcess, ChildProcessSpawner } from "effect/process";

import { prepareReceiver } from "./dev-receiver";

const PRIVATE_UMASK = 0o077;
const ARGUMENT_OFFSET = 2;
process.umask(PRIVATE_UMASK);

const dev = Effect.gen(function* dev() {
  const receiver = yield* prepareReceiver();
  yield* Effect.logInfo(`Mainnet receiver ready at ${receiver.basePath}; it stays running after Vite exits.`);
  const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
  const code = yield* spawner.exitCode(
    ChildProcess.make("pnpm", ["exec", "vp", "dev", ...process.argv.slice(ARGUMENT_OFFSET)], {
      stdin: "inherit",
      stdout: "inherit",
      stderr: "inherit",
      extendEnv: true,
      env: { BARK_RECEIVER_URL: receiver.basePath, BARK_RECEIVER_TOKEN: Redacted.value(receiver.token) },
    }),
  );
  if (code !== 0) {
    yield* Effect.fail(new Error(`Vite exited with code ${code}.`));
  }
});

NodeRuntime.runMain(dev.pipe(Effect.scoped, Effect.provide(NodeServices.layer)));
