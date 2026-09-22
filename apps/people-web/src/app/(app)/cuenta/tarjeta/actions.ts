'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { applyNewPaymentSource, type BillableSubscription } from '@org/domain';
import { createAdminSupabase } from '@org/supabase/server';
import type { CardSubmission } from '../../../../components/card-form';
import {
  capturePaymentSource,
  chargeSubscription,
  getOwnSubscription,
  hasPendingPayment,
  wompiClient,
} from '../../../../lib/billing';
import { getSession } from '../../../../lib/session';

export interface UpdateCardResult {
  error?: string;
}

/**
 * Replaces the Wompi payment source. Past-due and canceled subscriptions are
 * reactivated per `applyNewPaymentSource`; when that makes a charge due right
 * away we attempt it immediately instead of waiting for the hourly run.
 */
export async function updateCardAction(
  input: CardSubmission,
): Promise<UpdateCardResult> {
  const { userId, email } = await getSession();
  if (!userId) return { error: 'Inicia sesión para continuar.' };
  if (!email) return { error: 'Tu cuenta no tiene un correo verificado.' };
  const subscription = await getOwnSubscription();
  if (!subscription) redirect('/suscripcion/tarjeta');

  const captured = await capturePaymentSource(input, email);
  if ('error' in captured) return { error: captured.error };
  const { source } = captured;

  const now = new Date();
  const patch = applyNewPaymentSource(
    subscription as BillableSubscription,
    now,
  );
  const admin = createAdminSupabase();
  const { error } = await admin
    .from('subscriptions')
    .update({
      wompi_payment_source_id: source.id,
      wompi_customer_email: email,
      card_brand: source.public_data?.brand ?? input.brand ?? null,
      card_last4: source.public_data?.last_four ?? input.last4 ?? null,
      ...(patch
        ? {
            status: patch.status,
            next_charge_at: patch.next_charge_at?.toISOString() ?? null,
            charge_attempts: patch.charge_attempts ?? 0,
            canceled_at: patch.canceled_at?.toISOString() ?? null,
          }
        : {}),
    })
    .eq('id', subscription.id)
    .eq('consumer_id', userId);
  if (error) {
    console.error('[billing] card update failed', error);
    return { error: 'No pudimos guardar la tarjeta. Intenta de nuevo.' };
  }

  let outcome: 'ok' | 'reactivada' | 'cobro' = 'ok';
  if (patch) {
    outcome = subscription.status === 'canceled' ? 'reactivada' : 'ok';
    const dueNow =
      patch.next_charge_at !== null &&
      patch.next_charge_at.getTime() <= now.getTime();
    if (dueNow && !(await hasPendingPayment(admin, subscription.id))) {
      const { data: fresh } = await admin
        .from('subscriptions')
        .select('*')
        .eq('id', subscription.id)
        .single();
      if (fresh) {
        await chargeSubscription(admin, wompiClient(), fresh, now);
        outcome = 'cobro';
      }
    }
  }
  revalidatePath('/cuenta');
  redirect(`/cuenta?tarjeta=${outcome}`);
}
