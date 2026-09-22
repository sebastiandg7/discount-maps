'use client';

import { useActionState, useState } from 'react';
import { CATEGORIES, DEFAULT_MAP_CENTER, MAX_BRANCHES } from '@org/domain';
import { PlaceAutocompleteInput } from '@org/maps';
import {
  Button,
  FieldShell,
  FormError,
  InputField,
  SelectField,
  TextareaField,
  fieldControlClassName,
  type AuthActionState,
  type AuthFormAction,
} from '@org/ui';

interface BranchDraft {
  key: number;
  name: string;
  addressLine: string;
  city: string;
  lat: string;
  lng: string;
  phone: string;
  googlePlaceId: string;
}

let nextKey = 1;
function emptyBranch(): BranchDraft {
  return {
    key: nextKey++,
    name: '',
    addressLine: '',
    city: 'Bogotá',
    lat: '',
    lng: '',
    phone: '',
    googlePlaceId: '',
  };
}

const initial: AuthActionState = {};

export function OnboardingForm({
  action,
  mapsApiKey,
}: {
  action: AuthFormAction;
  /** `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`, read by the server page. */
  mapsApiKey: string | null;
}) {
  const [state, formAction, pending] = useActionState(action, initial);
  const [branches, setBranches] = useState<BranchDraft[]>(() => [
    emptyBranch(),
  ]);

  const update = (key: number, patch: Partial<BranchDraft>) =>
    setBranches((list) =>
      list.map((b) => (b.key === key ? { ...b, ...patch } : b)),
    );

  const locate = (key: number) => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        update(key, {
          lat: pos.coords.latitude.toFixed(6),
          lng: pos.coords.longitude.toFixed(6),
        }),
      () =>
        update(key, {
          lat: String(DEFAULT_MAP_CENTER.lat),
          lng: String(DEFAULT_MAP_CENTER.lng),
        }),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  const serialized = JSON.stringify(
    branches.map((b) => ({
      name: b.name,
      addressLine: b.addressLine,
      city: b.city,
      lat: Number(b.lat),
      lng: Number(b.lng),
      phone: b.phone,
      googlePlaceId: b.googlePlaceId,
    })),
  );

  return (
    <form action={formAction} className="flex flex-col gap-6" noValidate>
      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-ink">Tu empresa</h2>
        <InputField
          id="displayName"
          name="displayName"
          label="Nombre comercial"
          defaultValue={state.values?.displayName}
          required
          error={state.fieldErrors?.displayName}
        />
        <InputField
          id="legalName"
          name="legalName"
          label="Razón social"
          defaultValue={state.values?.legalName}
          required
          error={state.fieldErrors?.legalName}
        />
        <InputField
          id="nit"
          name="nit"
          label="NIT"
          placeholder="900123456-7"
          inputMode="numeric"
          defaultValue={state.values?.nit}
          required
          error={state.fieldErrors?.nit}
        />
        <SelectField
          id="category"
          name="category"
          label="Categoría"
          placeholder="Selecciona una categoría"
          defaultValue={state.values?.category ?? ''}
          options={CATEGORIES.map((c) => ({ value: c.id, label: c.label }))}
          required
          error={state.fieldErrors?.category}
        />
        <TextareaField
          id="description"
          name="description"
          label="Descripción (opcional)"
          maxLength={500}
          defaultValue={state.values?.description}
          error={state.fieldErrors?.description}
        />
        <InputField
          id="phone"
          name="phone"
          label="Teléfono de contacto (opcional)"
          inputMode="tel"
          defaultValue={state.values?.phone}
          error={state.fieldErrors?.phone}
        />
        <InputField
          id="logo"
          name="logo"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          label="Logo (opcional)"
          hint="PNG, JPG o WebP. Máximo 2 MB."
          error={state.fieldErrors?.logo}
        />
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink">Sedes</h2>
          <span className="text-sm text-ink-muted">
            {branches.length} de {MAX_BRANCHES}
          </span>
        </div>
        <p className="text-sm text-ink-muted">
          Cada sede aparece como un punto en el mapa. Usa tu ubicación actual si
          estás en la sede.
        </p>
        {branches.map((b, i) => (
          <fieldset
            key={b.key}
            className="flex flex-col gap-3 rounded-card border border-line p-4"
          >
            <legend className="px-1 text-sm font-semibold text-ink">
              Sede {i + 1}
            </legend>
            <InputField
              id={`branch-${b.key}-name`}
              label="Nombre de la sede"
              value={b.name}
              onChange={(e) => update(b.key, { name: e.target.value })}
              required
            />
            <FieldShell
              id={`branch-${b.key}-address`}
              label="Dirección"
              hint={
                mapsApiKey
                  ? 'Escribe y elige la dirección; llenamos ciudad y coordenadas.'
                  : undefined
              }
            >
              <PlaceAutocompleteInput
                id={`branch-${b.key}-address`}
                apiKey={mapsApiKey}
                className={fieldControlClassName}
                value={b.addressLine}
                onChange={(text) =>
                  update(b.key, { addressLine: text, googlePlaceId: '' })
                }
                onSelect={(place) =>
                  update(b.key, {
                    addressLine: place.addressLine,
                    city: place.city || b.city,
                    lat: place.lat.toFixed(6),
                    lng: place.lng.toFixed(6),
                    googlePlaceId: place.placeId,
                  })
                }
                required
              />
            </FieldShell>
            <InputField
              id={`branch-${b.key}-city`}
              label="Ciudad"
              value={b.city}
              onChange={(e) => update(b.key, { city: e.target.value })}
              required
            />
            <div className="grid grid-cols-2 gap-3">
              <InputField
                id={`branch-${b.key}-lat`}
                label="Latitud"
                inputMode="decimal"
                value={b.lat}
                onChange={(e) => update(b.key, { lat: e.target.value })}
                required
              />
              <InputField
                id={`branch-${b.key}-lng`}
                label="Longitud"
                inputMode="decimal"
                value={b.lng}
                onChange={(e) => update(b.key, { lng: e.target.value })}
                required
              />
            </div>
            <InputField
              id={`branch-${b.key}-phone`}
              label="Teléfono (opcional)"
              inputMode="tel"
              value={b.phone}
              onChange={(e) => update(b.key, { phone: e.target.value })}
            />
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => locate(b.key)}
              >
                Usar mi ubicación
              </Button>
              {branches.length > 1 ? (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() =>
                    setBranches((l) => l.filter((x) => x.key !== b.key))
                  }
                >
                  Quitar
                </Button>
              ) : null}
            </div>
          </fieldset>
        ))}
        {branches.length < MAX_BRANCHES ? (
          <Button
            type="button"
            variant="secondary"
            onClick={() => setBranches((l) => [...l, emptyBranch()])}
          >
            Agregar otra sede
          </Button>
        ) : null}
        <input type="hidden" name="branches" value={serialized} />
      </section>

      <FormError message={state.error} />
      <Button type="submit" block loading={pending}>
        Enviar para verificación
      </Button>
      <p className="text-center text-sm text-ink-muted">
        Revisaremos tu empresa y te avisaremos por correo cuando esté aprobada.
      </p>
    </form>
  );
}
