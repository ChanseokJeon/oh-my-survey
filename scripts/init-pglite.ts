/**
 * Initialize PGlite Database
 * Creates schema and test user for local development
 *
 * Usage: npx tsx scripts/init-pglite.ts
 */

import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import * as fs from 'fs';
import * as path from 'path';

const PGLITE_PATH = process.env.PGLITE_PATH || './data/pglite';

async function initPGlite() {
  console.log('🚀 Initializing PGlite database...\n');

  // Ensure data directory exists
  const dataDir = path.dirname(PGLITE_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
    console.log(`📁 Created directory: ${dataDir}`);
  }

  // Create PGlite instance
  const client = new PGlite(PGLITE_PATH);
  const db = drizzle(client);

  console.log(`📦 PGlite path: ${PGLITE_PATH}`);

  // Run migrations
  console.log('\n📋 Running migrations...');
  try {
    await migrate(db, { migrationsFolder: './drizzle' });
    console.log('✅ Migrations complete');
  } catch (error) {
    // If migrations folder doesn't exist, create schema manually
    console.log('⚠️  No migrations found, creating schema manually...');
    await createSchemaManually(client);
  }

  // Create test user
  console.log('\n👤 Creating test user...');
  try {
    await client.query(`
      INSERT INTO users (id, email, name, created_at, updated_at)
      VALUES (
        gen_random_uuid(),
        'test@example.com',
        'Test User',
        NOW(),
        NOW()
      )
      ON CONFLICT (email) DO NOTHING
    `);
    console.log('✅ Test user ready (test@example.com / test1234)');
  } catch (error) {
    console.log('⚠️  Test user may already exist');
  }

  // Verify
  const result = await client.query('SELECT COUNT(*) as count FROM users');
  const row = result.rows[0] as { count: string };
  console.log(`\n📊 Total users: ${row.count}`);

  await client.close();
  console.log('\n✅ PGlite initialization complete!');
  console.log('\n💡 To use PGlite, set DB_PROVIDER=pglite in .env.local');
}

async function createSchemaManually(client: PGlite) {
  // Create enums
  await client.query(`
    DO $$ BEGIN
      CREATE TYPE survey_status AS ENUM ('draft', 'published', 'closed');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

  await client.query(`
    DO $$ BEGIN
      CREATE TYPE survey_theme AS ENUM ('light', 'dark', 'minimal');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

  await client.query(`
    DO $$ BEGIN
      CREATE TYPE question_type AS ENUM ('short_text', 'long_text', 'multiple_choice', 'yes_no', 'rating');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

  // Create users table
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

  // Create accounts table
  await client.query(`
    CREATE TABLE IF NOT EXISTS accounts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type VARCHAR(255) NOT NULL,
      provider VARCHAR(255) NOT NULL,
      provider_account_id VARCHAR(255) NOT NULL,
      refresh_token TEXT,
      access_token TEXT,
      expires_at INTEGER,
      token_type VARCHAR(255),
      scope VARCHAR(255),
      id_token TEXT,
      session_state VARCHAR(255)
    )
  `);
  await client.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS provider_provider_account_id_idx
    ON accounts(provider, provider_account_id)
  `);

  // Create sessions table
  await client.query(`
    CREATE TABLE IF NOT EXISTS sessions (
      session_token VARCHAR(255) NOT NULL PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires TIMESTAMP NOT NULL
    )
  `);

  // Create verification_tokens table
  await client.query(`
    CREATE TABLE IF NOT EXISTS verification_tokens (
      identifier VARCHAR(255) NOT NULL,
      token VARCHAR(255) NOT NULL,
      expires TIMESTAMP NOT NULL
    )
  `);
  await client.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS verification_token_idx
    ON verification_tokens(identifier, token)
  `);

  // Create surveys table
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

  // Create questions table
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

  // Create responses table
  await client.query(`
    CREATE TABLE IF NOT EXISTS responses (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      survey_id UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
      answers_json JSONB NOT NULL,
      completed_at TIMESTAMP NOT NULL DEFAULT NOW(),
      ip_address VARCHAR(45)
    )
  `);

  console.log('✅ Schema created');
}

initPGlite().catch(console.error);
