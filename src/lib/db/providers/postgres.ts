/**
 * PostgreSQL Provider
 * For production and staging environments
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../schema';

let postgresClient: ReturnType<typeof postgres> | null = null;

export function createPostgresDatabase(connectionString: string) {
  if (!postgresClient) {
    postgresClient = postgres(connectionString);
  }

  return drizzle(postgresClient, { schema });
}

export async function closePostgres() {
  if (postgresClient) {
    await postgresClient.end();
    postgresClient = null;
  }
}
