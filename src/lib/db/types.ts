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
  const provider = ((process.env.DB_PROVIDER || 'pglite').trim()) as DbProvider;

  // Safety: Block PGlite in production (in-memory DB loses all data on restart)
  if (provider === 'pglite' && process.env.NODE_ENV === 'production') {
    // During `next build`, warn instead of crashing (build doesn't need a real DB)
    if (process.env.NEXT_PHASE === 'phase-production-build') {
      console.warn(
        '[DB] WARNING: PGlite detected during build. Ensure DB_PROVIDER=postgres at runtime.'
      );
    } else {
      throw new Error(
        '[DB] FATAL: PGlite (in-memory) cannot be used in production. ' +
        'Set DB_PROVIDER=postgres and DATABASE_URL in your environment variables.'
      );
    }
  }

  // Safety: Require DATABASE_URL when using postgres
  if (provider === 'postgres' && !process.env.DATABASE_URL) {
    throw new Error(
      '[DB] FATAL: DATABASE_URL is required when DB_PROVIDER=postgres. ' +
      'Set DATABASE_URL to your PostgreSQL connection string.'
    );
  }

  return {
    provider,
    pglitePath: process.env.PGLITE_PATH || './data/pglite',
    postgresUrl: process.env.DATABASE_URL,
  };
}
