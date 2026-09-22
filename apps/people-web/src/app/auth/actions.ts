'use server';

import { redirect } from 'next/navigation';
import { consumerSignupSchema, fieldErrorMap, loginSchema } from '@org/domain';
import { createServerSupabase, requestOrigin } from '@org/supabase/server';
import type { AuthActionState } from '@org/ui';

const HOME = '/mapas';

function appUrl(): Promise<string> {
  return requestOrigin('http://localhost:3000');
}

/** Only allow same-app relative paths as post-login destinations. */
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
      data: { full_name: parsed.data.fullName, role: 'consumer' },
      emailRedirectTo: `${await appUrl()}/auth/callback?next=${HOME}`,
    },
  });
  if (error) {
    return {
      error: /registered|exists/i.test(error.message)
        ? 'Ya existe una cuenta con este correo.'
        : 'No pudimos crear tu cuenta. Intenta de nuevo.',
    };
  }
  if (!data.session) {
    // Email confirmation is enabled on the project: the callback signs the user in.
    redirect('/login?mensaje=confirma');
  }
  redirect(HOME);
}

export async function googleAction(): Promise<void> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${await appUrl()}/auth/callback?next=${HOME}` },
  });
  if (error || !data.url) {
    redirect('/login?error=google');
  }
  redirect(data.url);
}

export async function signOutAction(): Promise<void> {
  const supabase = await createServerSupabase();
  await supabase.auth.signOut();
  redirect('/');
}
