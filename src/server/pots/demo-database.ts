import { Database } from "@/db/database";
import { Bark } from "@/server/bark/service";
import type { BarkOperations } from "@/server/bark/service";
import * as LibsqlClient from "@effect/sql-libsql/LibsqlClient";
import { Layer } from "effect";

import { PotStoreLive } from "./store";
import type { PotStore } from "./store";

export function demoLayer(directory: string, bark: BarkOperations): Layer.Layer<Database | Bark | PotStore> {
  const database = Database.layer.pipe(Layer.provide(LibsqlClient.layer({ url: `file:${directory}/pots.db` })));
  return Layer.mergeAll(database, Layer.succeed(Bark, bark), PotStoreLive.pipe(Layer.provide(database)));
}
