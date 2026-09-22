'use server';

import { revalidatePath } from 'next/cache';
import {
  cancelSubscription,
  fieldErrorMap,
  passwordChangeSchema,
  profileUpdateSchema,
  type BillableSubscription,
} from '@org/domain';
import { createAdminSupabase } from '@org/supabase/server';
import type { AuthActionState } from '@org/ui';
import { getOwnSubscription } from '../../../../lib/billing';
import { getSession } from '../../../../lib/session';

function text(formData: FormData, key: string): string {
  const v = formData.get(key);
  return typeof v === 'string' ? v : '';
}

export async function updateProfileAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const { supabase, userId } = await getSession();
  if (!userId) return { error: 'Inicia sesión para continuar.' };
  const values = {
    fullName: text(formData, 'fullName'),
    phone: text(formData, 'phone'),
  };
  const parsed = profileUpdateSchema.safeParse(values);
  if (!parsed.success) {
    return { fieldErrors: fieldErrorMap(parsed.error), values };
  }
  const { error } = await supabase
    .from('profiles')
    .update({
      full_name: parsed.data.fullName,
      phone: parsed.data.phone || null,
    })
    .eq('id', userId);
  if (error) {
    return {
      error: 'No pudimos guardar los cambios. Intenta de nuevo.',
      values,
    };
  }
  revalidatePath('/cuenta');
  return { message: 'Datos guardados.', values };
}

export async function changePasswordAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const { supabase, userId } = await getSession();
  if (!userId) return { error: 'Inicia sesión para continuar.' };
  const parsed = passwordChangeSchema.safeParse({
    password: text(formData, 'password'),
    confirm: text(formData, 'confirm'),
  });
  if (!parsed.success) {
    return { fieldErrors: fieldErrorMap(parsed.error) };
  }
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });
  if (error) {
    return {
      error: /same|different/i.test(error.message)
        ? 'La nueva contraseña debe ser diferente a la actual.'
        : 'No pudimos cambiar la contraseña. Intenta de nuevo.',
    };
  }
  return { message: 'Contraseña actualizada.' };
}

export interface CancelResult {
  error?: string;
}

/** Stops future charges; access continues until the paid period (or trial) ends. */
export async function cancelSubscriptionAction(): Promise<CancelResult> {
  const { userId } = await getSession();
  if (!userId) return { error: 'Inicia sesión para continuar.' };
  const subscription = await getOwnSubscription();
  if (!subscription) return { error: 'No encontramos tu suscripción.' };
  const patch = cancelSubscription(
    subscription as BillableSubscription,
    new Date(),
  );
  if (!patch) return {};
  const admin = createAdminSupabase();
  const { error } = await admin
    .from('subscriptions')
    .update({
      status: patch.status,
      next_charge_at: null,
      canceled_at: patch.canceled_at?.toISOString() ?? null,
    })
    .eq('id', subscription.id)
    .eq('consumer_id', userId);
  if (error) {
    console.error('[billing] cancel failed', error);
    return { error: 'No pudimos cancelar la suscripción. Intenta de nuevo.' };
  }
  revalidatePath('/cuenta');
  return {};
}
