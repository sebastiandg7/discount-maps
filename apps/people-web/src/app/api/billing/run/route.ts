import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { createAdminSupabase } from '@org/supabase/server';
import {
  chargeDueSubscriptions,
  reconcilePendingPayments,
  wompiClient,
  type BillingRunSummary,
} from '../../../../lib/billing';

export const dynamic = 'force-dynamic';

function authorized(request: Request): boolean {
  const expected = process.env.BILLING_CRON_SECRET;
  const given = request.headers.get('x-billing-secret') ?? '';
  if (!expected || !given) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(given);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Hourly billing run (pg_cron → pg_net → here). First settles pending
 * payments whose webhook never arrived, then charges every due subscription.
 */
export async function POST(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const admin = createAdminSupabase();
  const wompi = wompiClient();
  const now = new Date();
  const reconciled = await reconcilePendingPayments(admin, wompi, now);
  const charges = await chargeDueSubscriptions(admin, wompi, now);
  const summary: BillingRunSummary = { reconciled, ...charges };
  return NextResponse.json({ ok: true, ran_at: now.toISOString(), ...summary });
}
