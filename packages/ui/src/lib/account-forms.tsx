'use client';

import { useActionState } from 'react';
import type { AuthActionState, AuthFormAction } from './auth-forms';
import { Button } from './button';
import { FormError, InputField } from './field';

const initial: AuthActionState = {};

/** Green inline notice for a completed settings action. */
export function FormNotice({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <p
      role="status"
      className="rounded-card bg-success/10 px-4 py-3 text-sm text-success"
    >
      {message}
    </p>
  );
}

export interface ProfileFormProps {
  action: AuthFormAction;
  values: { fullName: string; phone: string; email: string };
}

/** Name + phone editor shared by both apps (email is read-only for now). */
export function ProfileForm({ action, values }: ProfileFormProps) {
  const [state, formAction, pending] = useActionState(action, initial);
  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <InputField
        id="fullName"
        name="fullName"
        label="Nombre"
        autoComplete="name"
        defaultValue={state.values?.fullName ?? values.fullName}
        required
        error={state.fieldErrors?.fullName}
      />
      <InputField
        id="phone"
        name="phone"
        label="Teléfono (opcional)"
        autoComplete="tel"
        inputMode="tel"
        defaultValue={state.values?.phone ?? values.phone}
        error={state.fieldErrors?.phone}
      />
      <InputField
        id="email"
        label="Correo"
        type="email"
        value={values.email}
        readOnly
        hint="Escríbenos si necesitas cambiar tu correo."
      />
      <FormError message={state.error} />
      <FormNotice message={state.message} />
      <Button type="submit" variant="secondary" block loading={pending}>
        Guardar cambios
      </Button>
    </form>
  );
}

/** New password + confirmation; the action calls `auth.updateUser`. */
export function PasswordForm({ action }: { action: AuthFormAction }) {
  const [state, formAction, pending] = useActionState(action, initial);
  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <InputField
        id="password"
        name="password"
        type="password"
        label="Nueva contraseña"
        autoComplete="new-password"
        required
        minLength={8}
        error={state.fieldErrors?.password}
      />
      <InputField
        id="confirm"
        name="confirm"
        type="password"
        label="Repite la contraseña"
        autoComplete="new-password"
        required
        error={state.fieldErrors?.confirm}
      />
      <FormError message={state.error} />
      <FormNotice message={state.message} />
      <Button type="submit" variant="secondary" block loading={pending}>
        Cambiar contraseña
      </Button>
    </form>
  );
}
