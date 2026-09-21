import { createBrowserClient } from '@supabase/ssr';
import type { Database } from './database.types';
import { publicEnv } from './env';

/** Supabase client for Client Components. One instance per browser tab is fine. */
export function createBrowserSupabase() {
  const { url, publishableKey } = publicEnv();
  return createBrowserClient<Database>(url, publishableKey);
}

export type BrowserSupabase = ReturnType<typeof createBrowserSupabase>;
