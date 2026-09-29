import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import postgres from 'postgres';

export type Query = <T extends Record<string, unknown>>(sql: string, values?: (string | number)[]) => Promise<T[]>;
export type Connection = { query: Query; prefix: string; rowLock: string; order: string };
export type DatabaseProvider = <T>(operation: (connection: Connection) => Promise<T>, transaction?: boolean) => Promise<T>;
const shared = globalThis as unknown as { leagueDB?: DatabaseSync; leaguePostgres?: ReturnType<typeof postgres>; leagueQueue?: Promise<unknown> };

// Only local development uses a file. Vercel must have persistent PostgreSQL configured.
export function db() {
  if (process.env.DATABASE_URL || process.env.VERCEL) throw new Error('SQLite is available only for local development without DATABASE_URL.');
  if (!shared.leagueDB) {
    const filename = resolve(/* turbopackIgnore: true */ process.env.CLASS_LEAGUE_DB || 'data/class-league.sqlite');
    mkdirSync(dirname(filename), { recursive: true });
    shared.leagueDB = new DatabaseSync(filename);
    shared.leagueDB.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS classrooms (id TEXT PRIMARY KEY, name TEXT NOT NULL, salt TEXT NOT NULL, password TEXT NOT NULL, state TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, class_id TEXT NOT NULL REFERENCES classrooms(id), role TEXT NOT NULL, expires INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS attempts (class_id TEXT PRIMARY KEY, count INTEGER NOT NULL, until INTEGER NOT NULL);`);
  }
  return shared.leagueDB;
}

export const withDatabase: DatabaseProvider = async (operation, transaction = false) => {
  if (process.env.DATABASE_URL) {
    const sql = shared.leaguePostgres ??= postgres(process.env.DATABASE_URL, {
      max: 1, prepare: false, ssl: 'require', connect_timeout: 10, idle_timeout: 20,
      connection: { statement_timeout: 15000 },
    });
    const connect = (client: Pick<typeof sql, 'unsafe'>): Connection => ({
      query: async <T extends Record<string, unknown>>(query: string, values: (string | number)[] = []) => Array.from(await client.unsafe(query, values)) as T[],
      prefix: 'class_league.', rowLock: ' FOR UPDATE', order: 'created_at, id',
    });
    if (transaction) return sql.begin(client => operation(connect(client))) as Promise<Awaited<ReturnType<typeof operation>>>;
    return operation(connect(sql));
  }
  if (process.env.VERCEL) throw new Error('DATABASE_URL is required on Vercel.');
  // Serialize local requests so an awaited query cannot let another request enter a transaction.
  const pending = (shared.leagueQueue ?? Promise.resolve()).catch(() => {}).then(async () => {
    const database = db();
    const connection: Connection = {
      query: async <T extends Record<string, unknown>>(query: string, values: (string | number)[] = []) => database.prepare(query.replace(/\$\d+/g, '?')).all(...values) as T[],
      prefix: '', rowLock: '', order: 'rowid',
    };
    if (transaction) database.exec('BEGIN IMMEDIATE');
    try {
      const result = await operation(connection);
      if (transaction) database.exec('COMMIT');
      return result;
    } catch (error) {
      if (transaction) database.exec('ROLLBACK');
      throw error;
    }
  });
  shared.leagueQueue = pending;
  return pending;
};
