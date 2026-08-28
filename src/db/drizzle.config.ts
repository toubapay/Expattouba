import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

dotenv.config();

// Same DATABASE_URL convention as src/db/index.ts, so pushing against a
// remote (e.g. Render) database is just:
//   DATABASE_URL=<external connection string> npm run db:push
const databaseUrl = process.env.DATABASE_URL;

const sqlHost = process.env.SQL_HOST;
const sqlDbName = process.env.SQL_DB_NAME;
const user = process.env.SQL_ADMIN_USER;
const password = process.env.SQL_ADMIN_PASSWORD;

if (!databaseUrl && (!sqlHost || !sqlDbName || !user || !password)) {
  console.warn("Missing SQL admin environment variables, migrations might fail.");
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  schemaFilter: ["public"],
  dbCredentials: databaseUrl
    ? { url: databaseUrl, ssl: databaseUrl.includes("localhost") ? false : { rejectUnauthorized: false } }
    : {
        host: sqlHost as string,
        user: user as string,
        password: password as string,
        database: sqlDbName as string,
        ssl: false,
      },
  verbose: true,
});
