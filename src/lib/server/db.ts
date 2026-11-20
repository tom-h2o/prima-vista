import "server-only";

// Datenbankzugriff: Neon (Postgres) in Produktion, PGlite (Postgres im Prozess) lokal.
// Alle Abfragen casten Zahlen und Datumswerte explizit, damit beide Treiber gleiche Typen liefern.

type Row = Record<string, unknown>;
export type Query = (text: string, params?: unknown[]) => Promise<Row[]>;

const SCHEMA = `
create table if not exists rounds (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  local_date date not null,
  mode text not null,
  level int not null,
  note_count int not null,
  correct_count int not null,
  duration_ms int not null,
  completed boolean not null
);
create table if not exists answers (
  id bigserial primary key,
  round_id bigint not null references rounds(id) on delete cascade,
  clef text not null,
  note int not null,
  pressed int not null,
  correct boolean not null,
  time_ms int not null
);
create index if not exists answers_round_idx on answers(round_id);
create table if not exists note_stats (
  clef text not null,
  note int not null,
  attempts int not null,
  correct int not null,
  total_time_ms bigint not null,
  error_avg double precision not null,
  time_avg double precision not null,
  primary key (clef, note)
);
create table if not exists daily (
  local_date date primary key,
  practice_ms bigint not null default 0
);
create table if not exists progress (
  id int primary key,
  unlocked_level int not null default 1,
  records jsonb not null default '{}'::jsonb,
  settings jsonb not null default '{}'::jsonb
);
insert into progress (id) values (1) on conflict (id) do nothing;
`;

async function create(): Promise<Query> {
  const url = process.env.DATABASE_URL;
  let query: Query;
  let exec: (sql: string) => Promise<void>;
  if (url) {
    const { neon } = await import("@neondatabase/serverless");
    const sql = neon(url);
    query = async (text, params = []) => (await sql.query(text, params)) as Row[];
    exec = async (script) => {
      for (const stmt of script.split(";").map((s) => s.trim()).filter(Boolean)) await sql.query(stmt);
    };
  } else {
    const { PGlite } = await import("@electric-sql/pglite");
    const dir = process.env.PGLITE_DIR ?? ".data/pglite";
    if (dir !== "memory") (await import("node:fs")).mkdirSync(dir, { recursive: true });
    const db = dir === "memory" ? new PGlite() : new PGlite(dir);
    await db.waitReady;
    query = async (text, params = []) => (await db.query<Row>(text, params)).rows;
    exec = async (script) => {
      await db.exec(script);
    };
  }
  await exec(SCHEMA);
  return query;
}

export function db(): Promise<Query> {
  const g = globalThis as unknown as { __pvDb?: Promise<Query> };
  if (!g.__pvDb) {
    g.__pvDb = create().catch((err) => {
      g.__pvDb = undefined;
      throw err;
    });
  }
  return g.__pvDb;
}
