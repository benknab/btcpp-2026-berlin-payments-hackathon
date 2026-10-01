import { loadEnvironment } from "@/server/env";
import * as LibsqlClient from "@effect/sql-libsql/LibsqlClient";
import * as LibsqlDrizzle from "drizzle-orm/effect-libsql";
import { Config, Context, Layer, Option } from "effect";

loadEnvironment();

export class Database extends Context.Service<Database, LibsqlDrizzle.EffectLibsqlDatabase>()("payments/db/Database") {
  public static readonly layer = Layer.effect(Database, LibsqlDrizzle.makeWithDefaults());
}

const databaseUrl = Config.String("DATABASE_URL").pipe(Config.withDefault("file:local.db"));
const authToken = Config.Redacted("DATABASE_AUTH_TOKEN").pipe(Config.option, Config.map(Option.getOrUndefined));
const LibsqlLive = LibsqlClient.layerConfig({ url: databaseUrl, authToken });

export const DatabaseLive = Database.layer.pipe(Layer.provide(LibsqlLive));
