import { redirect } from 'next/navigation';
import { createServerSupabase } from '@org/supabase/server';

/** Signed-in area. proxy.ts already gates; this is defense in depth for server rendering. */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerSupabase();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) {
    redirect('/login');
  }
  return children;
}
