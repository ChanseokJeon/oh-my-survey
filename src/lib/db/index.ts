/**
 * Database Entry Point
 * Abstracts database provider selection based on environment configuration
 *
 * Usage:
 *   import { db, surveys, questions } from '@/lib/db';
 *
 * Environment Variables:
 *   DB_PROVIDER: 'pglite' | 'postgres' (default: 'pglite', blocked in production)
 *   PGLITE_PATH: Path for PGlite data (default: './data/pglite')
 *   DATABASE_URL: PostgreSQL connection string (required for postgres provider)
 */

import { createDatabase, ensurePGliteReady } from './providers';
import { getDbConfig } from './types';

// Load configuration from environment
const config = getDbConfig();

// Create database instance (singleton)
export const db = createDatabase(config);

// Export current provider for debugging/logging
export const currentProvider = config.provider;

/**
 * Ensures the database is ready for queries.
 * For PGlite, this waits for schema initialization to complete.
 * For PostgreSQL, this resolves immediately.
 */
export async function ensureDbReady(): Promise<void> {
  if (config.provider === 'pglite') {
    await ensurePGliteReady();
  }
  // PostgreSQL is ready immediately (schema is managed by migrations)
}

// Re-export schema for convenience
export * from './schema';

// Re-export types
export type { DbProvider, DbConfig } from './types';

// Re-export provider utilities (for cleanup in tests)
export { closePGlite, closePostgres } from './providers';
