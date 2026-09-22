import { NextResponse } from 'next/server';
import { verifyEventChecksum, type WompiEvent } from '@org/billing-wompi';
import type { Json } from '@org/supabase';
import { createAdminSupabase } from '@org/supabase/server';
import { recordPaymentOutcome } from '../../../../lib/billing';

export const dynamic = 'force-dynamic';

/**
 * Wompi `transaction.updated` events. Idempotent through `wompi_events`
 * (checksum primary key); always answers 200 once the event is stored so Wompi
 * stops retrying, and 401 when the checksum does not verify.
 */
export async function POST(request: Request) {
  const secret = process.env.WOMPI_EVENTS_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'not configured' }, { status: 500 });
  }
  let event: WompiEvent;
  try {
    event = (await request.json()) as WompiEvent;
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }
  if (
    !event ||
    typeof event.event !== 'string' ||
    !event.signature?.checksum ||
    !Array.isArray(event.signature.properties) ||
    typeof event.timestamp !== 'number'
  ) {
    return NextResponse.json({ error: 'malformed event' }, { status: 400 });
  }
  if (
    !verifyEventChecksum(event, secret, request.headers.get('x-event-checksum'))
  ) {
    return NextResponse.json({ error: 'bad checksum' }, { status: 401 });
  }

  const admin = createAdminSupabase();
  const transaction = event.data?.transaction;
  const { error: insertError } = await admin.from('wompi_events').insert({
    checksum: event.signature.checksum.toLowerCase(),
    event_type: event.event,
    environment: event.environment ?? 'unknown',
    payload: event as unknown as Json,
    wompi_transaction_id: transaction?.id ?? null,
  });
  if (insertError) {
    if (insertError.code === '23505') {
      return NextResponse.json({ ok: true, duplicate: true });
    }
    console.error('[wompi] event insert failed', insertError);
    return NextResponse.json({ error: 'storage' }, { status: 500 });
  }

  let result = 'ignored';
  if (event.event === 'transaction.updated' && transaction?.id) {
    const { data: byId } = await admin
      .from('payments')
      .select('*')
      .eq('wompi_transaction_id', transaction.id)
      .maybeSingle();
    const payment =
      byId ??
      (transaction.reference
        ? (
            await admin
              .from('payments')
              .select('*')
              .eq('reference', transaction.reference)
              .maybeSingle()
          ).data
        : null);
    if (payment) {
      result = await recordPaymentOutcome(admin, payment, transaction);
    } else {
      result = 'unknown_payment';
    }
  }
  await admin
    .from('wompi_events')
    .update({ processed_at: new Date().toISOString() })
    .eq('checksum', event.signature.checksum.toLowerCase());
  return NextResponse.json({ ok: true, result });
}
