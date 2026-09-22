'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import {
  COUPON_TOKEN_REFRESH_SECONDS,
  couponTokenSecondsLeft,
  isCouponTokenExpired,
  parseCouponToken,
} from '@org/domain';
import { Button, FormError, QrCode, Spinner, buttonClassName } from '@org/ui';
import { issueCouponTokenAction, type IssueTokenResult } from './actions';

interface Props {
  couponId: string;
}

/**
 * Rotating QR: a new token every COUPON_TOKEN_REFRESH_SECONDS, a countdown from
 * the token's own expiry, and an immediate refresh when the tab comes back
 * after the token lapsed (timers are throttled in background tabs).
 */
export function CouponQr({ couponId }: Props) {
  const [token, setToken] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [failure, setFailure] = useState<Exclude<
    IssueTokenResult,
    { token: string }
  > | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(() => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    startTransition(async () => {
      const result = await issueCouponTokenAction(couponId);
      if ('token' in result) {
        setFailure(null);
        setToken(result.token);
        refreshTimer.current = setTimeout(
          refresh,
          COUPON_TOKEN_REFRESH_SECONDS * 1000,
        );
      } else {
        setToken(null);
        setFailure(result);
      }
    });
  }, [couponId]);

  useEffect(() => {
    refresh();
    return () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
    };
  }, [refresh]);

  // countdown + refresh when the token expires before the scheduled refresh
  useEffect(() => {
    if (!token) {
      setSecondsLeft(null);
      return;
    }
    const parsed = parseCouponToken(token);
    if (!parsed) return;
    const tick = () => {
      const left = couponTokenSecondsLeft(parsed);
      setSecondsLeft(left);
      if (left === 0) refresh();
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [token, refresh]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== 'visible' || !token) return;
      const parsed = parseCouponToken(token);
      if (!parsed || isCouponTokenExpired(parsed)) refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [token, refresh]);

  if (failure?.error === 'SUBSCRIPTION_INACTIVE') {
    return (
      <div
        role="status"
        className="rounded-card border border-line bg-surface-muted p-4 text-center"
      >
        <p className="font-semibold text-ink">Tu suscripción no está activa</p>
        <p className="mt-1 text-sm text-ink-muted">{failure.message}</p>
        <Link
          href="/cuenta"
          className={buttonClassName('primary', 'mt-4 w-full')}
        >
          Ver mi suscripción
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 text-center">
      {token ? (
        <QrCode value={token} className={pending ? 'opacity-60' : ''} />
      ) : failure ? null : (
        <div className="flex aspect-square w-60 items-center justify-center">
          <Spinner />
        </div>
      )}

      {failure ? (
        <>
          <FormError message={failure.message} />
          <Button type="button" variant="secondary" onClick={refresh}>
            Reintentar
          </Button>
        </>
      ) : null}

      {token ? (
        <>
          <p aria-live="polite" className="text-sm text-ink-muted">
            Muestra este código en la caja · se actualiza en{' '}
            <strong className="tabular-nums text-ink">
              {secondsLeft ?? '–'} s
            </strong>
          </p>
          <details className="w-full text-left">
            <summary className="cursor-pointer text-xs text-ink-muted">
              Código manual
            </summary>
            <code
              data-token={token}
              className="mt-2 block break-all rounded-card bg-surface-muted p-2 text-[10px] leading-snug text-ink-muted"
            >
              {token}
            </code>
            <Button
              type="button"
              variant="ghost"
              className="mt-2 w-full text-sm"
              onClick={() => {
                navigator.clipboard
                  ?.writeText(token)
                  .then(() => setCopied(true))
                  .catch(() => setCopied(false));
              }}
            >
              {copied ? 'Copiado' : 'Copiar'}
            </Button>
          </details>
        </>
      ) : null}
    </div>
  );
}
