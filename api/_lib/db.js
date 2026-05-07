const postgres = require("postgres");

let sqlClient;
let schemaPromise;

function getDatabaseUrl() {
  return process.env.POSTGRES_URL || process.env.DATABASE_URL || "";
}

function getSql() {
  const databaseUrl = getDatabaseUrl();
  if (!databaseUrl) {
    throw new Error("Missing POSTGRES_URL or DATABASE_URL environment variable");
  }

  if (!sqlClient) {
    sqlClient = postgres(databaseUrl, {
      ssl: "require",
      max: 1,
      idle_timeout: 20,
      connect_timeout: 10,
    });
  }

  return sqlClient;
}

async function ensureSchema() {
  if (!schemaPromise) {
    const sql = getSql();
    schemaPromise = sql`
      create table if not exists dashboard_state (
        id text primary key,
        payload jsonb not null,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      )
    `;
  }

  return schemaPromise;
}

module.exports = {
  ensureSchema,
  getSql,
};
