/**
 * Database Provider Factory
 * Creates appropriate database instance based on configuration
 */

import type { DbConfig } from '../types';
import { createPGliteDatabase } from './pglite';
import { createPostgresDatabase } from './postgres';

export function createDatabase(config: DbConfig) {
  console.log(`[DB] Initializing ${config.provider} provider`);

  switch (config.provider) {
    case 'pglite': {
      const path = config.pglitePath || './data/pglite';
      console.log(`[DB] PGlite path: ${path}`);
      return createPGliteDatabase(path);
    }

    case 'postgres': {
      if (!config.postgresUrl) {
        throw new Error('DATABASE_URL is required for postgres provider');
      }
      console.log('[DB] Connecting to PostgreSQL');
      return createPostgresDatabase(config.postgresUrl);
    }

    default:
      throw new Error(`Unknown DB provider: ${config.provider}`);
  }
}

export { closePGlite, getPGliteInstance, ensurePGliteReady } from './pglite';
export { closePostgres } from './postgres';
