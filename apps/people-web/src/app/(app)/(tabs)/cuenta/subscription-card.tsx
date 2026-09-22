'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import {
  formatCop,
  formatDate,
  subscriptionStatusLabels,
  type SubscriptionStatus,
} from '@org/domain';
import { Button, buttonClassName, FormError, FormNotice } from '@org/ui';
import { cancelSubscriptionAction } from './actions';

export interface SubscriptionCardProps {
  status: SubscriptionStatus;
  cardBrand: string | null;
  cardLast4: string | null;
  /** ISO timestamps (already computed on the server). */
  accessUntil: string | null;
  nextChargeAt: string | null;
  trialEndsAt: string;
  pricePesos: number;
  /** A payment is in flight (card just updated, or the hourly run charged it). */
  pendingCharge?: boolean;
  /** From `?tarjeta=ok|reactivada` after the card page. */
  notice?: string | null;
}

const STATUS_TONE: Record<SubscriptionStatus, string> = {
  trialing: 'bg-brand-50 text-brand-700',
  active: 'bg-success/10 text-success',
  past_due: 'bg-danger/10 text-danger',
  canceled: 'bg-surface-muted text-ink-muted',
};

function describe(p: SubscriptionCardProps): string {
  const until = formatDate(p.accessUntil);
  switch (p.status) {
    case 'trialing':
      return `Tu semana gratis termina el ${formatDate(
        p.trialEndsAt,
      )}. Ese día haremos el primer cobro de ${formatCop(p.pricePesos)}.`;
    case 'active':
      return `Próximo cobro de ${formatCop(p.pricePesos)}: ${formatDate(
        p.nextChargeAt,
      )}.`;
    case 'past_due':
      if (p.pendingCharge) {
        return `Estamos procesando el cobro de ${formatCop(p.pricePesos)}${
          until ? `. Tu acceso sigue hasta el ${until}` : ''
        }.`;
      }
      return `No pudimos cobrar tu tarjeta. Volveremos a intentarlo el ${formatDate(
        p.nextChargeAt,
      )}${until ? ` y tu acceso sigue hasta el ${until}` : ''}.`;
    case 'canceled':
      return p.accessUntil && new Date(p.accessUntil).getTime() > Date.now()
        ? `No haremos más cobros. Puedes seguir usando tus cupones hasta el ${until}.`
        : `Tu suscripción terminó${until ? ` el ${until}` : ''}.`;
  }
}

export function SubscriptionCard(props: SubscriptionCardProps) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const canceled = props.status === 'canceled';

  const cancel = () =>
    startTransition(async () => {
      const result = await cancelSubscriptionAction();
      if (result.error) setError(result.error);
      else setConfirming(false);
    });

  return (
    <section
      aria-label="Suscripción"
      className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-ink">Suscripción</h2>
        <span
          className={`rounded-pill px-3 py-1 text-xs font-semibold ${STATUS_TONE[props.status]}`}
          data-status={props.status}
        >
          {subscriptionStatusLabels[props.status]}
        </span>
      </div>
      <p className="text-sm text-ink-muted">{describe(props)}</p>
      {props.cardBrand || props.cardLast4 ? (
        <p className="text-sm text-ink">
          Tarjeta: <strong>{props.cardBrand ?? 'Tarjeta'}</strong>
          {props.cardLast4 ? ` •••• ${props.cardLast4}` : ''}
        </p>
      ) : (
        <p className="text-sm text-ink">Sin tarjeta registrada.</p>
      )}
      <FormNotice message={props.notice} />
      <FormError message={error} />

      <div className="flex flex-col gap-2">
        <Link
          href="/cuenta/tarjeta"
          className={buttonClassName(canceled ? 'primary' : 'secondary')}
        >
          {canceled ? 'Reactivar suscripción' : 'Actualizar tarjeta'}
        </Link>
        {!canceled && !confirming ? (
          <Button
            type="button"
            variant="ghost"
            onClick={() => setConfirming(true)}
          >
            Cancelar suscripción
          </Button>
        ) : null}
        {!canceled && confirming ? (
          <div
            role="alertdialog"
            aria-label="Confirmar cancelación"
            className="flex flex-col gap-2 rounded-card bg-surface-muted p-3"
          >
            <p className="text-sm text-ink">
              No haremos más cobros. Podrás usar tus cupones hasta el{' '}
              <strong>{formatDate(props.accessUntil)}</strong>. ¿Quieres
              cancelar?
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="danger"
                onClick={cancel}
                loading={pending}
              >
                Sí, cancelar
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setConfirming(false)}
                disabled={pending}
              >
                Volver
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
