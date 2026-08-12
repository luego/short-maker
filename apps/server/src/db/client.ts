import "dotenv/config";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema.js";

const serverRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const defaultDatabasePath = resolve(serverRoot, "data/app.db");
const databaseUrl = process.env.DB_FILE_NAME ?? `file:${defaultDatabasePath}`;
if (databaseUrl.startsWith("file:")) {
  mkdirSync(dirname(databaseUrl.slice(5)), { recursive: true });
}

export const client = createClient({ url: databaseUrl });
export const database = drizzle({ client, schema });
