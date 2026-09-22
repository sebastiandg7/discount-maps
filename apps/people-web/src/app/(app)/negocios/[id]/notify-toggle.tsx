'use client';

import { useEffect, useState, useTransition } from 'react';
import { Button, Toggle } from '@org/ui';
import { followBusinessAction, unfollowBusinessAction } from './actions';

interface Props {
  businessId: string;
  initialFollowing: boolean;
  vapidPublicKey: string | null;
}

type Support = 'unknown' | 'ok' | 'ios-install' | 'unsupported';

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

function detectSupport(): Support {
  if (typeof window === 'undefined') return 'unknown';
  const ua = navigator.userAgent;
  const isIos =
    /iPhone|iPad|iPod/.test(ua) ||
    (ua.includes('Mac') && 'ontouchend' in document);
  const standalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  const hasPush =
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window;
  if (hasPush) return 'ok';
  if (isIos && !standalone) return 'ios-install';
  return 'unsupported';
}

/**
 * "Avisarme de nuevos cupones" switch. Asks for notification permission inside
 * the click (browsers require a user gesture), subscribes the service worker
 * to push and stores the subscription + follow through server actions.
 */
export function NotifyToggle({
  businessId,
  initialFollowing,
  vapidPublicKey,
}: Props) {
  const [following, setFollowing] = useState(initialFollowing);
  const [support, setSupport] = useState<Support>('unknown');
  const [sheet, setSheet] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setSupport(detectSupport());
  }, []);

  const enable = async () => {
    setMessage(null);
    if (support === 'ios-install') {
      setSheet(true);
      return;
    }
    if (support !== 'ok' || !vapidPublicKey) {
      setMessage('Este navegador no permite notificaciones.');
      return;
    }
    let permission: NotificationPermission;
    try {
      permission = await Notification.requestPermission();
    } catch {
      permission = 'denied';
    }
    if (permission !== 'granted') {
      setMessage(
        permission === 'denied'
          ? 'Las notificaciones están bloqueadas para este sitio. Actívalas en la configuración del navegador.'
          : 'No activaste las notificaciones.',
      );
      return;
    }
    startTransition(async () => {
      try {
        const registration = await navigator.serviceWorker.ready;
        const existing = await registration.pushManager.getSubscription();
        const subscription =
          existing ??
          (await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
          }));
        const json = subscription.toJSON();
        if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
          setMessage('No pudimos registrar este dispositivo.');
          return;
        }
        const result = await followBusinessAction(
          businessId,
          {
            endpoint: json.endpoint,
            keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
          },
          navigator.userAgent,
        );
        if (result.error) setMessage(result.error);
        else setFollowing(true);
      } catch (error) {
        console.warn('[push] subscribe failed', error);
        setMessage(
          'No pudimos activar las notificaciones en este dispositivo.',
        );
      }
    });
  };

  const disable = () => {
    setMessage(null);
    startTransition(async () => {
      const result = await unfollowBusinessAction(businessId);
      if (result.error) setMessage(result.error);
      else setFollowing(false);
    });
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <Toggle
        label="Avisarme de nuevos cupones"
        hideLabel
        checked={following}
        disabled={pending || support === 'unknown'}
        onChange={(next) => (next ? void enable() : disable())}
      />
      {message ? (
        <p
          role="alert"
          className="max-w-[14rem] text-right text-xs text-danger"
        >
          {message}
        </p>
      ) : null}
      {sheet ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="ios-install-title"
          className="fixed inset-0 z-30 flex items-end bg-ink/50"
          onClick={() => setSheet(false)}
        >
          <div
            className="w-full rounded-t-card bg-surface p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
            onClick={(e) => e.stopPropagation()}
          >
            <p
              id="ios-install-title"
              className="text-lg font-semibold text-ink"
            >
              Añade Discount Maps a tu pantalla de inicio
            </p>
            <p className="mt-2 text-sm text-ink-muted">
              En iPhone las notificaciones solo funcionan desde la app
              instalada: toca <strong>Compartir</strong> en Safari, elige{' '}
              <strong>Añadir a pantalla de inicio</strong> y vuelve a activar el
              aviso desde ahí.
            </p>
            <Button
              type="button"
              block
              className="mt-4"
              onClick={() => setSheet(false)}
            >
              Entendido
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
