/**
 * PGlite Provider
 * Lightweight PostgreSQL for local development
 *
 * Uses globalThis pattern to survive Next.js module re-evaluation in dev mode.
 * This ensures a single PGlite instance across all module contexts.
 */

import { drizzle } from 'drizzle-orm/pglite';
import { PGlite } from '@electric-sql/pglite';
import * as schema from '../schema';

// Use globalThis to survive Next.js module re-evaluation in dev mode
const globalForPGlite = globalThis as unknown as {
  pgliteInstance: PGlite | undefined;
  pgliteInitPromise: Promise<void> | undefined;
  pgliteDataPath: string | undefined;
};

/**
 * Creates PostgreSQL enum types for the database schema.
 * Uses DO $$ blocks to avoid errors if enums already exist.
 */
async function createEnumTypes(client: PGlite): Promise<void> {
  await client.query(`
    DO $$ BEGIN CREATE TYPE survey_status AS ENUM ('draft', 'published', 'closed');
    EXCEPTION WHEN duplicate_object THEN null; END $$;
  `);
  await client.query(`
    DO $$ BEGIN CREATE TYPE survey_theme AS ENUM ('light', 'dark', 'minimal');
    EXCEPTION WHEN duplicate_object THEN null; END $$;
  `);
  await client.query(`
    DO $$ BEGIN CREATE TYPE question_type AS ENUM ('short_text', 'long_text', 'multiple_choice', 'yes_no', 'rating');
    EXCEPTION WHEN duplicate_object THEN null; END $$;
  `);
}

/**
 * Creates NextAuth.js-related tables for authentication.
 * Includes users, accounts, sessions, and verification_tokens tables.
 */
async function createAuthTables(client: PGlite): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR(255) NOT NULL UNIQUE,
      name VARCHAR(255),
      image TEXT,
      email_verified TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS accounts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type VARCHAR(255) NOT NULL,
      provider VARCHAR(255) NOT NULL,
      provider_account_id VARCHAR(255) NOT NULL,
      refresh_token TEXT, access_token TEXT, expires_at INTEGER,
      token_type VARCHAR(255), scope VARCHAR(255), id_token TEXT, session_state VARCHAR(255)
    )
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS sessions (
      session_token VARCHAR(255) NOT NULL PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires TIMESTAMP NOT NULL
    )
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS verification_tokens (
      identifier VARCHAR(255) NOT NULL,
      token VARCHAR(255) NOT NULL,
      expires TIMESTAMP NOT NULL
    )
  `);
}

/**
 * Creates application-specific tables for the survey system.
 * Includes surveys, questions, and responses tables.
 */
async function createAppTables(client: PGlite): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS surveys (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title VARCHAR(200) NOT NULL,
      slug VARCHAR(250) NOT NULL UNIQUE,
      status survey_status NOT NULL DEFAULT 'draft',
      theme survey_theme NOT NULL DEFAULT 'light',
      logo_base64 TEXT,
      sheets_config JSONB,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS questions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      survey_id UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
      type question_type NOT NULL,
      title VARCHAR(500) NOT NULL,
      options JSONB,
      required BOOLEAN NOT NULL DEFAULT false,
      "order" INTEGER NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS responses (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      survey_id UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
      answers_json JSONB NOT NULL,
      completed_at TIMESTAMP NOT NULL DEFAULT NOW(),
      ip_address VARCHAR(45)
    )
  `);
}

/**
 * Seeds initial test data for development.
 * Creates a test user if it doesn't already exist.
 */
async function seedTestData(client: PGlite): Promise<void> {
  await client.query(`
    INSERT INTO users (email, name)
    VALUES ('test@example.com', 'Test User')
    ON CONFLICT (email) DO NOTHING
  `);
}

/**
 * Initializes the complete database schema.
 * Orchestrates enum creation, table creation, and test data seeding.
 */
async function initializeSchema(client: PGlite): Promise<void> {
  console.log('[PGlite] Creating schema...');

  await createEnumTypes(client);
  await createAuthTables(client);
  await createAppTables(client);
  await seedTestData(client);

  console.log('[PGlite] Schema ready');
}

/**
 * Creates a PGlite database instance with in-memory storage.
 *
 * @param _dataPath - Ignored parameter. File path is not used due to Next.js 15 compatibility.
 *
 * **Why _dataPath is ignored:**
 * - Next.js 15 dev mode runs RSC server and page renderer in separate processes
 * - File-based PGlite causes WASM crashes when multiple processes access the same directory
 * - In-memory mode avoids multi-process file locking issues entirely
 * - Singleton pattern via globalThis ensures single instance across all module contexts
 *
 * @returns Drizzle database instance configured with PGlite
 */
export function createPGliteDatabase(_dataPath: string) {
  // NOTE: Using in-memory mode to avoid multi-process file locking issues
  // Next.js 15 dev mode runs RSC server and page renderer in separate processes
  // File-based PGlite causes WASM crashes when multiple processes access same directory

  // Reuse existing instance (singleton pattern via globalThis)
  if (!globalForPGlite.pgliteInstance) {
    console.log(`[PGlite] Creating NEW in-memory instance (process.pid=${process.pid})`);
    globalForPGlite.pgliteDataPath = 'memory://';
    // Use in-memory mode to avoid file locking conflicts
    globalForPGlite.pgliteInstance = new PGlite();

    // Start schema initialization and track the promise
    globalForPGlite.pgliteInitPromise = initializeSchema(globalForPGlite.pgliteInstance);
  } else {
    console.log(`[PGlite] Reusing existing in-memory instance`);
  }

  return drizzle(globalForPGlite.pgliteInstance, { schema });
}

/**
 * Ensures PGlite schema is fully initialized before database operations.
 * Call this before any database queries to avoid race conditions.
 */
export async function ensurePGliteReady(): Promise<void> {
  if (!globalForPGlite.pgliteInitPromise) {
    throw new Error('[PGlite] Database not initialized. Call createPGliteDatabase first.');
  }
  await globalForPGlite.pgliteInitPromise;
}

export async function closePGlite() {
  if (globalForPGlite.pgliteInstance) {
    await globalForPGlite.pgliteInstance.close();
    globalForPGlite.pgliteInstance = undefined;
    globalForPGlite.pgliteInitPromise = undefined;
    globalForPGlite.pgliteDataPath = undefined;
  }
}

export function getPGliteInstance() {
  console.log(`[PGlite] getPGliteInstance called: instance=${globalForPGlite.pgliteInstance ? 'EXISTS' : 'NULL'}`);
  return globalForPGlite.pgliteInstance;
}
