'use client';

import { useEffect, useState } from 'react';
import { Button } from './button';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

type Mode = 'hidden' | 'prompt' | 'ios';

const DISMISS_MS = 7 * 24 * 60 * 60 * 1000;

function isStandalone(): boolean {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIosSafari(): boolean {
  const ua = navigator.userAgent;
  const ios =
    /iPhone|iPad|iPod/.test(ua) ||
    (ua.includes('Mac') && 'ontouchend' in document);
  return ios && /Safari/.test(ua) && !/CriOS|FxiOS/.test(ua);
}

function dismissedRecently(key: string): boolean {
  try {
    const at = Number(localStorage.getItem(key) ?? 0);
    return Date.now() - at < DISMISS_MS;
  } catch {
    return false;
  }
}

export interface InstallHintProps {
  appName?: string;
  /** localStorage key remembering "Ahora no" for a week. */
  storageKey?: string;
  className?: string;
}

/**
 * "Instalar la app" card: uses `beforeinstallprompt` where Chrome offers it
 * (Android, desktop) and explains "Añadir a pantalla de inicio" on iOS Safari.
 * Renders nothing inside an installed app or after a recent dismissal.
 */
export function InstallHint({
  appName = 'Discount Maps',
  storageKey = 'dm-install-hint',
  className = '',
}: InstallHintProps) {
  const [mode, setMode] = useState<Mode>('hidden');
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  );

  useEffect(() => {
    if (isStandalone() || dismissedRecently(storageKey)) return;
    if (isIosSafari()) setMode('ios');
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
      setMode('prompt');
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, [storageKey]);

  const dismiss = () => {
    try {
      localStorage.setItem(storageKey, String(Date.now()));
    } catch {
      // private mode: just hide for this page view
    }
    setMode('hidden');
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    if (outcome === 'accepted') setMode('hidden');
    setDeferred(null);
  };

  if (mode === 'hidden') return null;
  return (
    <aside
      aria-label="Instalar la app"
      className={`flex flex-col gap-3 rounded-card border border-line bg-surface p-4 text-sm text-ink ${className}`}
    >
      {mode === 'prompt' ? (
        <>
          <p>
            Instala <strong>{appName}</strong> en tu teléfono para abrirla desde
            la pantalla de inicio.
          </p>
          <div className="flex gap-2">
            <Button type="button" onClick={install}>
              Instalar la app
            </Button>
            <Button type="button" variant="ghost" onClick={dismiss}>
              Ahora no
            </Button>
          </div>
        </>
      ) : (
        <>
          <p>
            Añade <strong>{appName}</strong> a tu pantalla de inicio: toca{' '}
            <span aria-hidden="true">⎙</span> Compartir y luego «Añadir a
            pantalla de inicio».
          </p>
          <div>
            <Button type="button" variant="ghost" onClick={dismiss}>
              Entendido
            </Button>
          </div>
        </>
      )}
    </aside>
  );
}
