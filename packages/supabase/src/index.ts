// Types and pure helpers only. Import clients from the subpaths:
//   @org/supabase/browser  → createBrowserSupabase (Client Components)
//   @org/supabase/server   → createServerSupabase, createAdminSupabase (server only)
//   @org/supabase/proxy    → updateSession, PROXY_MATCHER (src/proxy.ts)
export type { Database, Json } from './database.types';
export { roleFromClaims, type UserRole } from './roles';
export { publicStorageUrl } from './storage';

import type { Database } from './database.types';

type PublicSchema = Database['public'];

export type Tables<T extends keyof PublicSchema['Tables']> =
  PublicSchema['Tables'][T]['Row'];
export type TablesInsert<T extends keyof PublicSchema['Tables']> =
  PublicSchema['Tables'][T]['Insert'];
export type TablesUpdate<T extends keyof PublicSchema['Tables']> =
  PublicSchema['Tables'][T]['Update'];
export type Views<T extends keyof PublicSchema['Views']> =
  PublicSchema['Views'][T]['Row'];
export type Enums<T extends keyof PublicSchema['Enums']> =
  PublicSchema['Enums'][T];
