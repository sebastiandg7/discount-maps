'use client';

import { useActionState, useState, useTransition } from 'react';
import { DEFAULT_MAP_CENTER, MAX_BRANCHES } from '@org/domain';
import {
  Button,
  FormError,
  FormNotice,
  InputField,
  type AuthActionState,
  type AuthFormAction,
} from '@org/ui';
import { deleteBranchAction } from './actions';

export interface BranchRow {
  id: string;
  name: string;
  addressLine: string;
  city: string;
  phone: string | null;
}

const initial: AuthActionState = {};

export function BranchList({ branches }: { branches: BranchRow[] }) {
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const remove = (id: string) => {
    setError(null);
    setPendingId(id);
    startTransition(async () => {
      const result = await deleteBranchAction(id);
      if (result.error) setError(result.error);
      setPendingId(null);
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-2" aria-label="Sedes">
        {branches.map((b) => (
          <li
            key={b.id}
            className="flex items-center justify-between gap-3 rounded-card border border-line px-4 py-3"
          >
            <div className="min-w-0">
              <p className="font-semibold text-ink">{b.name}</p>
              <p className="truncate text-sm text-ink-muted">
                {b.addressLine}, {b.city}
                {b.phone ? ` · ${b.phone}` : ''}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              onClick={() => remove(b.id)}
              loading={pendingId === b.id}
              disabled={branches.length <= 1 || pendingId !== null}
              aria-label={`Quitar ${b.name}`}
            >
              Quitar
            </Button>
          </li>
        ))}
      </ul>
      {branches.length <= 1 ? (
        <p className="text-sm text-ink-muted">
          Tu empresa necesita al menos una sede.
        </p>
      ) : null}
      <FormError message={error} />
    </div>
  );
}

export function AddBranchForm({
  action,
  count,
}: {
  action: AuthFormAction;
  count: number;
}) {
  const [state, formAction, pending] = useActionState(action, initial);
  const [coords, setCoords] = useState({ lat: '', lng: '' });
  const v = state.values ?? {};

  const locate = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        setCoords({
          lat: pos.coords.latitude.toFixed(6),
          lng: pos.coords.longitude.toFixed(6),
        }),
      () =>
        setCoords({
          lat: String(DEFAULT_MAP_CENTER.lat),
          lng: String(DEFAULT_MAP_CENTER.lng),
        }),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  if (count >= MAX_BRANCHES) {
    return (
      <p className="text-sm text-ink-muted">
        Llegaste al máximo de {MAX_BRANCHES} sedes.
      </p>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-3" noValidate>
      <InputField
        id="branch-name"
        name="name"
        label="Nombre de la sede"
        defaultValue={v.name}
        required
        error={state.fieldErrors?.name}
      />
      <InputField
        id="branch-address"
        name="addressLine"
        label="Dirección"
        defaultValue={v.addressLine}
        required
        error={state.fieldErrors?.addressLine}
      />
      <InputField
        id="branch-city"
        name="city"
        label="Ciudad"
        defaultValue={v.city ?? 'Bogotá'}
        required
        error={state.fieldErrors?.city}
      />
      <div className="grid grid-cols-2 gap-3">
        <InputField
          id="branch-lat"
          name="lat"
          label="Latitud"
          inputMode="decimal"
          value={coords.lat || v.lat || ''}
          onChange={(e) => setCoords((c) => ({ ...c, lat: e.target.value }))}
          required
          error={state.fieldErrors?.lat}
        />
        <InputField
          id="branch-lng"
          name="lng"
          label="Longitud"
          inputMode="decimal"
          value={coords.lng || v.lng || ''}
          onChange={(e) => setCoords((c) => ({ ...c, lng: e.target.value }))}
          required
          error={state.fieldErrors?.lng}
        />
      </div>
      <InputField
        id="branch-phone"
        name="phone"
        label="Teléfono (opcional)"
        inputMode="tel"
        defaultValue={v.phone}
        error={state.fieldErrors?.phone}
      />
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" onClick={locate}>
          Usar mi ubicación
        </Button>
        <Button type="submit" loading={pending}>
          Agregar sede
        </Button>
      </div>
      <FormError message={state.error} />
      <FormNotice message={state.message} />
    </form>
  );
}
