/**
 * PGlite Provider
 * Lightweight PostgreSQL for local development
 */

import { drizzle } from 'drizzle-orm/pglite';
import { PGlite } from '@electric-sql/pglite';
import * as schema from '../schema';

let pgliteInstance: PGlite | null = null;
let initializationPromise: Promise<void> | null = null;

async function initializeSchema(client: PGlite) {
  console.log('[PGlite] Creating schema...');

  // Create enums
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

  // Create tables
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

  // Create test user
  await client.query(`
    INSERT INTO users (email, name)
    VALUES ('test@example.com', 'Test User')
    ON CONFLICT (email) DO NOTHING
  `);

  console.log('[PGlite] Schema ready');
}

export function createPGliteDatabase(dataPath: string) {
  // NOTE: PGlite has issues with Next.js 15 webpack bundling (URL path error)
  // This is a known issue - for now, recommend using postgres provider for local dev
  // See: https://github.com/electric-sql/pglite/issues

  // Reuse existing instance (singleton pattern)
  if (!pgliteInstance) {
    console.log(`[PGlite] Initializing database at: ${dataPath}`);
    // Use file-based persistence to survive hot reloads
    pgliteInstance = new PGlite(dataPath);

    // Start schema initialization and track the promise
    initializationPromise = initializeSchema(pgliteInstance);
  }

  return drizzle(pgliteInstance, { schema });
}

/**
 * Ensures PGlite schema is fully initialized before database operations.
 * Call this before any database queries to avoid race conditions.
 */
export async function ensurePGliteReady(): Promise<void> {
  if (!initializationPromise) {
    throw new Error('[PGlite] Database not initialized. Call createPGliteDatabase first.');
  }
  await initializationPromise;
}

export async function closePGlite() {
  if (pgliteInstance) {
    await pgliteInstance.close();
    pgliteInstance = null;
    initializationPromise = null;
  }
}

export function getPGliteInstance() {
  return pgliteInstance;
}
