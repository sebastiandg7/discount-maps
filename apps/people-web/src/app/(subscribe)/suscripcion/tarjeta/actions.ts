'use server';

import { redirect } from 'next/navigation';
import { WompiError } from '@org/billing-wompi';
import { addDays, TRIAL_DAYS } from '@org/domain';
import { createAdminSupabase } from '@org/supabase/server';
import { getOwnSubscription, wompiClient } from '../../../../lib/billing';
import { getSession } from '../../../../lib/session';

export interface StartTrialInput {
  /** Card token minted in the browser with the public key (tok_test_… / tok_prod_…). */
  cardToken: string;
  acceptanceToken: string;
  acceptPersonalAuth: string;
  /** Display data from the tokenization response (fallback when Wompi omits public_data). */
  brand?: string | null;
  last4?: string | null;
}

export interface StartTrialResult {
  error?: string;
}

const GENERIC =
  'No pudimos registrar tu tarjeta. Revisa los datos e intenta de nuevo.';

/**
 * Turns a card token into a Wompi payment source and opens the 7-day trial.
 * The subscription row is written with the service role (RLS forbids consumers).
 */
export async function startTrialAction(
  input: StartTrialInput,
): Promise<StartTrialResult> {
  const { userId, email } = await getSession();
  if (!userId) return { error: 'Inicia sesión para continuar.' };
  if (!email) return { error: 'Tu cuenta no tiene un correo verificado.' };
  if (
    typeof input.cardToken !== 'string' ||
    !/^tok_(test|prod)_/.test(input.cardToken) ||
    !input.acceptanceToken ||
    !input.acceptPersonalAuth
  ) {
    return { error: GENERIC };
  }
  if (await getOwnSubscription()) redirect('/mapas');

  let source;
  try {
    source = await wompiClient().createPaymentSource({
      token: input.cardToken,
      customerEmail: email,
      acceptanceToken: input.acceptanceToken,
      acceptPersonalAuth: input.acceptPersonalAuth,
    });
  } catch (error) {
    console.error(
      '[billing] payment source failed',
      error instanceof WompiError ? error.body : error,
    );
    return { error: GENERIC };
  }
  if (source.status !== 'AVAILABLE') {
    return {
      error:
        'Tu banco requiere una verificación adicional que aún no soportamos. Intenta con otra tarjeta.',
    };
  }

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
      return { error: GENERIC };
    }
  }
  redirect('/mapas?bienvenida=1');
}
