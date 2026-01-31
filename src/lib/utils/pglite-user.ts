import { currentProvider } from "@/lib/db";
import { getPGliteInstance } from "@/lib/db/providers";

/**
 * Resolves the actual user ID to use in PGlite environment.
 *
 * In PGlite's multi-process environment, the same user may have different IDs
 * across processes. This function ensures we use a consistent user ID by:
 * 1. If user exists by session ID - use that
 * 2. If user exists by email (different ID) - use the existing ID
 * 3. If neither exists - create new user with session ID
 *
 * @returns The actual user ID to use, or null if user cannot be resolved
 */
export async function resolveUserIdForPGlite(
  sessionUserId: string,
  email: string | null | undefined
): Promise<string | null> {
  // Only applies to PGlite
  if (currentProvider !== 'pglite') {
    return sessionUserId;
  }

  const pglite = getPGliteInstance();
  if (!pglite) return null;

  // Check if user exists by ID
  const existingById = await pglite.query(
    `SELECT id FROM users WHERE id = $1 LIMIT 1`,
    [sessionUserId]
  );

  if (existingById.rows.length > 0) {
    return sessionUserId;
  }

  // User doesn't exist by ID - check if email already exists
  if (email) {
    const existingByEmail = await pglite.query<{ id: string }>(
      `SELECT id FROM users WHERE email = $1 LIMIT 1`,
      [email]
    );

    if (existingByEmail.rows.length > 0) {
      // Email exists with different ID - use the EXISTING user ID
      const existingUserId = existingByEmail.rows[0].id;
      console.log('[PGlite] User email exists with different ID, using existing:', existingUserId);
      return existingUserId;
    }

    // Neither ID nor email exists - create new user
    console.log('[PGlite] User not found, creating:', sessionUserId);
    await pglite.query(
      `INSERT INTO users (id, email, name) VALUES ($1, $2, $3)`,
      [sessionUserId, email, email.split("@")[0]]
    );
    return sessionUserId;
  }

  return null;
}

/**
 * Gets the actual user ID for a session in PGlite environment.
 * Does NOT create the user if they don't exist (use resolveUserIdForPGlite for that).
 */
export async function getActualUserIdForPGlite(
  sessionUserId: string,
  email: string | null | undefined
): Promise<string | null> {
  // Only applies to PGlite
  if (currentProvider !== 'pglite') {
    return sessionUserId;
  }

  const pglite = getPGliteInstance();
  if (!pglite) return null;

  // Check if user exists by ID
  const existingById = await pglite.query(
    `SELECT id FROM users WHERE id = $1 LIMIT 1`,
    [sessionUserId]
  );

  if (existingById.rows.length > 0) {
    return sessionUserId;
  }

  // Check if user exists by email
  if (email) {
    const existingByEmail = await pglite.query<{ id: string }>(
      `SELECT id FROM users WHERE email = $1 LIMIT 1`,
      [email]
    );

    if (existingByEmail.rows.length > 0) {
      return existingByEmail.rows[0].id;
    }
  }

  return null;
}
