import type { Database } from './database.types';

export type UserRole = Database['public']['Enums']['user_role'];

const ROLES: readonly UserRole[] = ['consumer', 'business', 'admin'];

/**
 * Reads the role the database mirrored into `app_metadata` (see `handle_new_user`).
 * Accepts JWT claims or a `User` object; returns null when absent or unknown.
 */
export function roleFromClaims(
  source: { app_metadata?: Record<string, unknown> | null } | null | undefined,
): UserRole | null {
  const role = source?.app_metadata?.['role'];
  return typeof role === 'string' && (ROLES as readonly string[]).includes(role)
    ? (role as UserRole)
    : null;
}
