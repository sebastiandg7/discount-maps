'use server';

import { redirect } from 'next/navigation';
import { addDays, TRIAL_DAYS } from '@org/domain';
import { createAdminSupabase } from '@org/supabase/server';
import type { CardSubmission } from '../../../../components/card-form';
import {
  CARD_CAPTURE_ERROR,
  capturePaymentSource,
  getOwnSubscription,
} from '../../../../lib/billing';
import { getSession } from '../../../../lib/session';

export interface StartTrialResult {
  error?: string;
}

/**
 * Turns a card token into a Wompi payment source and opens the 7-day trial.
 * The subscription row is written with the service role (RLS forbids consumers).
 */
export async function startTrialAction(
  input: CardSubmission,
): Promise<StartTrialResult> {
  const { userId, email } = await getSession();
  if (!userId) return { error: 'Inicia sesión para continuar.' };
  if (!email) return { error: 'Tu cuenta no tiene un correo verificado.' };
  if (await getOwnSubscription()) redirect('/mapas');

  const captured = await capturePaymentSource(input, email);
  if ('error' in captured) return { error: captured.error };
  const { source } = captured;

  const now = new Date();
  const trialEndsAt = addDays(now, TRIAL_DAYS);
  const admin = createAdminSupabase();
  const { error } = await admin.from('subscriptions').insert({
    consumer_id: userId,
    status: 'trialing',
    trial_ends_at: trialEndsAt.toISOString(),
    next_charge_at: trialEndsAt.toISOString(),
    wompi_payment_source_id: source.id,
    wompi_customer_email: email,
    card_brand: source.public_data?.brand ?? input.brand ?? null,
    card_last4: source.public_data?.last_four ?? input.last4 ?? null,
  });
  if (error) {
    // Unique consumer_id: a concurrent submit already created it.
    if (error.code !== '23505') {
      console.error('[billing] subscription insert failed', error);
      return { error: CARD_CAPTURE_ERROR };
    }
  }
  redirect('/mapas?bienvenida=1');
}
