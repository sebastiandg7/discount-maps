'use server';

import { redirect } from 'next/navigation';
import { consumerSignupSchema, fieldErrorMap, loginSchema } from '@org/domain';
import { createServerSupabase } from '@org/supabase/server';
import type { AuthActionState } from '@org/ui';

const HOME = '/inicio';

function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3001';
}

function safeNext(value: FormDataEntryValue | null): string {
  return typeof value === 'string' &&
    value.startsWith('/') &&
    !value.startsWith('//')
    ? value
    : HOME;
}

export async function loginAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });
  if (!parsed.success) {
    return { fieldErrors: fieldErrorMap(parsed.error) };
  }
  const supabase = await createServerSupabase();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    return { error: 'Correo o contraseña incorrectos.' };
  }
  redirect(safeNext(formData.get('next')));
}

/**
 * Creates the owner's account with role = business. Company details, branches and
 * logo are collected right after, in /onboarding.
 */
export async function signupAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = consumerSignupSchema.safeParse({
    fullName: formData.get('fullName'),
    email: formData.get('email'),
    password: formData.get('password'),
  });
  if (!parsed.success) {
    return { fieldErrors: fieldErrorMap(parsed.error) };
  }
  const supabase = await createServerSupabase();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName, role: 'business' },
      emailRedirectTo: `${appUrl()}/auth/callback?next=/onboarding`,
    },
  });
  if (error) {
    return {
      error: /registered|exists/i.test(error.message)
        ? 'Ya existe una cuenta con este correo.'
        : 'No pudimos crear la cuenta. Intenta de nuevo.',
    };
  }
  if (!data.session) {
    redirect('/login?mensaje=confirma');
  }
  redirect('/onboarding');
}

export async function signOutAction(): Promise<void> {
  const supabase = await createServerSupabase();
  await supabase.auth.signOut();
  redirect('/');
}
