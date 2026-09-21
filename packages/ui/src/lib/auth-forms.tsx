'use client';

import { useActionState } from 'react';
import { Button } from './button';
import { FormError, InputField } from './field';

export interface AuthActionState {
  error?: string | null;
  fieldErrors?: Partial<Record<string, string>>;
  /** Submitted values echoed back so uncontrolled inputs survive a failed action (React 19 resets forms). */
  values?: Partial<Record<string, string>>;
}

export type AuthFormAction = (
  prev: AuthActionState,
  formData: FormData,
) => Promise<AuthActionState>;

const initial: AuthActionState = {};

export interface LoginFormProps {
  action: AuthFormAction;
  /** Server action that starts the Google OAuth flow. Omit to hide the button. */
  googleAction?: () => Promise<void>;
  registerHref: string;
  /** Relative path to go to after login (from ?next=). */
  next?: string;
}

export function LoginForm({
  action,
  googleAction,
  registerHref,
  next,
}: LoginFormProps) {
  const [state, formAction, pending] = useActionState(action, initial);
  return (
    <div className="flex flex-col gap-6">
      <form action={formAction} className="flex flex-col gap-4" noValidate>
        {next ? <input type="hidden" name="next" value={next} /> : null}
        <InputField
          id="email"
          name="email"
          type="email"
          label="Correo"
          autoComplete="email"
          inputMode="email"
          required
          error={state.fieldErrors?.email}
        />
        <InputField
          id="password"
          name="password"
          type="password"
          label="Contraseña"
          autoComplete="current-password"
          required
          error={state.fieldErrors?.password}
        />
        <FormError message={state.error} />
        <Button type="submit" block loading={pending}>
          Iniciar sesión
        </Button>
      </form>
      {googleAction ? (
        <form action={googleAction}>
          <Button type="submit" variant="secondary" block>
            <GoogleIcon /> Continuar con Google
          </Button>
        </form>
      ) : null}
      <p className="text-center text-sm text-ink-muted">
        ¿No tienes cuenta?{' '}
        <a href={registerHref} className="font-semibold text-brand-600">
          Crear cuenta
        </a>
      </p>
    </div>
  );
}

export interface SignupFormProps {
  action: AuthFormAction;
  googleAction?: () => Promise<void>;
  loginHref: string;
  /** Extra fields rendered between the personal fields and the submit button. */
  children?: React.ReactNode;
  submitLabel?: string;
}

export function SignupForm({
  action,
  googleAction,
  loginHref,
  children,
  submitLabel = 'Crear cuenta',
}: SignupFormProps) {
  const [state, formAction, pending] = useActionState(action, initial);
  return (
    <div className="flex flex-col gap-6">
      <form action={formAction} className="flex flex-col gap-4" noValidate>
        <InputField
          id="fullName"
          name="fullName"
          label="Nombre completo"
          autoComplete="name"
          required
          error={state.fieldErrors?.fullName}
        />
        <InputField
          id="email"
          name="email"
          type="email"
          label="Correo"
          autoComplete="email"
          inputMode="email"
          required
          error={state.fieldErrors?.email}
        />
        <InputField
          id="password"
          name="password"
          type="password"
          label="Contraseña"
          hint="Mínimo 8 caracteres."
          autoComplete="new-password"
          minLength={8}
          required
          error={state.fieldErrors?.password}
        />
        {children}
        <FormError message={state.error} />
        <Button type="submit" block loading={pending}>
          {submitLabel}
        </Button>
      </form>
      {googleAction ? (
        <form action={googleAction}>
          <Button type="submit" variant="secondary" block>
            <GoogleIcon /> Continuar con Google
          </Button>
        </form>
      ) : null}
      <p className="text-center text-sm text-ink-muted">
        ¿Ya tienes cuenta?{' '}
        <a href={loginHref} className="font-semibold text-brand-600">
          Iniciar sesión
        </a>
      </p>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.6 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.3l7.8 6C12.3 13.4 17.7 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4 7.1-10 7.1-17.5z"
      />
      <path
        fill="#FBBC05"
        d="M10.4 28.7c-.5-1.5-.8-3-.8-4.7s.3-3.2.8-4.7l-7.8-6C.9 16.5 0 20.1 0 24s.9 7.5 2.6 10.7l7.8-6z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.9 2.3-8.4 2.3-6.3 0-11.7-3.9-13.6-9.5l-7.8 6C6.5 42.6 14.6 48 24 48z"
      />
    </svg>
  );
}
