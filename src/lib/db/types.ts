/**
 * Database Provider Types
 * Supports switching between PGlite (local) and PostgreSQL (production)
 */

export type DbProvider = 'pglite' | 'postgres';

export interface DbConfig {
  provider: DbProvider;
  pglitePath?: string;
  postgresUrl?: string;
}

export function getDbConfig(): DbConfig {
  const provider = (process.env.DB_PROVIDER || 'pglite') as DbProvider;

  return {
    provider,
    pglitePath: process.env.PGLITE_PATH || './data/pglite',
    postgresUrl: process.env.DATABASE_URL,
  };
}
