'use client';

import { useState, useTransition } from 'react';
import { Toggle } from '@org/ui';
import { setCouponActiveAction } from './actions';

interface Props {
  couponId: string;
  isActive: boolean;
  /** When false the switch is disabled with an explanation (minimum reached). */
  canDeactivate: boolean;
}

export function CouponToggle({ couponId, isActive, canDeactivate }: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const blocked = isActive && !canDeactivate;

  return (
    <div className="flex flex-col items-end gap-1">
      <Toggle
        label={isActive ? 'Activo' : 'Inactivo'}
        checked={isActive}
        disabled={pending || blocked}
        onChange={(next) => {
          setError(null);
          startTransition(async () => {
            const result = await setCouponActiveAction(couponId, next);
            if (result.error) setError(result.error);
          });
        }}
      />
      {blocked ? (
        <p className="max-w-[12rem] text-right text-xs text-ink-muted">
          Activa otro cupón antes de desactivar este.
        </p>
      ) : null}
      {error ? (
        <p
          role="alert"
          className="max-w-[14rem] text-right text-xs text-danger"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
