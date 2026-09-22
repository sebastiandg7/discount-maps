'use client';

import { useActionState } from 'react';
import { CATEGORIES } from '@org/domain';
import {
  Button,
  FormError,
  FormNotice,
  InputField,
  SelectField,
  TextareaField,
  type AuthActionState,
  type AuthFormAction,
} from '@org/ui';

export interface BusinessFormValues {
  displayName: string;
  legalName: string;
  nit: string;
  category: string;
  description: string;
}

const initial: AuthActionState = {};

export function BusinessForm({
  action,
  values,
  logoUrl,
}: {
  action: AuthFormAction;
  values: BusinessFormValues;
  logoUrl: string | null;
}) {
  const [state, formAction, pending] = useActionState(action, initial);
  const v = { ...values, ...state.values };
  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <InputField
        id="displayName"
        name="displayName"
        label="Nombre comercial"
        defaultValue={v.displayName}
        required
        error={state.fieldErrors?.displayName}
      />
      <InputField
        id="legalName"
        name="legalName"
        label="Razón social"
        defaultValue={v.legalName}
        required
        error={state.fieldErrors?.legalName}
      />
      <InputField
        id="nit"
        name="nit"
        label="NIT"
        placeholder="900123456-7"
        inputMode="numeric"
        defaultValue={v.nit}
        required
        error={state.fieldErrors?.nit}
      />
      <SelectField
        id="category"
        name="category"
        label="Categoría"
        defaultValue={v.category}
        options={CATEGORIES.map((c) => ({ value: c.id, label: c.label }))}
        required
        error={state.fieldErrors?.category}
      />
      <TextareaField
        id="description"
        name="description"
        label="Descripción (opcional)"
        maxLength={500}
        defaultValue={v.description}
        error={state.fieldErrors?.description}
      />
      <div className="flex items-center gap-4">
        {logoUrl ? (
          <img
            src={logoUrl}
            alt="Logo actual"
            className="size-16 rounded-card border border-line object-cover"
          />
        ) : null}
        <div className="flex-1">
          <InputField
            id="logo"
            name="logo"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            label={logoUrl ? 'Cambiar logo' : 'Logo (opcional)'}
            hint="PNG, JPG o WebP. Máximo 2 MB."
            error={state.fieldErrors?.logo}
          />
        </div>
      </div>
      <FormError message={state.error} />
      <FormNotice message={state.message} />
      <Button type="submit" variant="secondary" block loading={pending}>
        Guardar cambios
      </Button>
    </form>
  );
}
