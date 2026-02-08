#!/usr/bin/env tsx

/**
 * Check Neon DB Health
 * Tests database connectivity and runs basic health queries
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

const DATABASE_URL = 'postgresql://neondb_owner:npg_lqhvBxVtSN59@ep-aged-pine-a1cdlygv-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';

async function checkDatabase() {
  console.log('🔍 Checking Neon DB Health...\n');

  try {
    const sql = postgres(DATABASE_URL);
    const db = drizzle(sql);

    // Test 1: Connection test
    console.log('1️⃣ Testing database connection...');
    const connectionTest = await sql`SELECT NOW() as current_time`;
    console.log('✅ Connection successful:', connectionTest[0].current_time);
    console.log();

    // Test 2: List all tables
    console.log('2️⃣ Listing all tables...');
    const tables = await sql`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename
    `;
    console.log('📋 Tables found:', tables.map(t => t.tablename).join(', '));
    console.log();

    // Test 3: Count surveys
    console.log('3️⃣ Counting surveys...');
    try {
      const surveyCount = await sql`SELECT count(*) as count FROM surveys`;
      console.log('📊 Survey count:', surveyCount[0].count);
    } catch (e: any) {
      console.log('⚠️  Survey table query failed:', e.message);
    }
    console.log();

    // Test 4: Sample surveys
    console.log('4️⃣ Fetching sample surveys...');
    try {
      const surveys = await sql`
        SELECT id, title, slug, status, created_at
        FROM surveys
        LIMIT 5
      `;
      console.log('📝 Sample surveys:');
      surveys.forEach((s: any) => {
        console.log(`  - ${s.title} (${s.slug}) [${s.status}]`);
      });
    } catch (e: any) {
      console.log('⚠️  Survey query failed:', e.message);
    }
    console.log();

    // Test 5: Count questions
    console.log('5️⃣ Counting questions...');
    try {
      const questionCount = await sql`SELECT count(*) as count FROM questions`;
      console.log('📊 Question count:', questionCount[0].count);
    } catch (e: any) {
      console.log('⚠️  Question table query failed:', e.message);
    }
    console.log();

    // Test 6: Count responses
    console.log('6️⃣ Counting responses...');
    try {
      const responseCount = await sql`SELECT count(*) as count FROM responses`;
      console.log('📊 Response count:', responseCount[0].count);
    } catch (e: any) {
      console.log('⚠️  Response table query failed:', e.message);
    }
    console.log();

    // Test 7: Count users
    console.log('7️⃣ Counting users...');
    try {
      const userCount = await sql`SELECT count(*) as count FROM users`;
      console.log('📊 User count:', userCount[0].count);
    } catch (e: any) {
      console.log('⚠️  User table query failed:', e.message);
    }
    console.log();

    console.log('✅ Database health check completed successfully!');
  } catch (error: any) {
    console.error('❌ Database health check failed:', error.message);
    process.exit(1);
  }
}

checkDatabase();
