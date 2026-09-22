'use client';

import dynamic from 'next/dynamic';
import { useRef, useState, useTransition } from 'react';
import type { IDetectedBarcode, IScannerError } from '@yudiel/react-qr-scanner';
import { redemptionMessage, type VerifyCouponResult } from '@org/domain';
import {
  Button,
  FormError,
  SelectField,
  Spinner,
  TextareaField,
} from '@org/ui';
import { verifyCouponTokenAction } from './actions';

// Touches navigator/window at render time: client-only.
const Scanner = dynamic(
  () => import('@yudiel/react-qr-scanner').then((m) => m.Scanner),
  {
    ssr: false,
    loading: () => (
      <div className="flex aspect-square w-full items-center justify-center rounded-card bg-surface-muted">
        <Spinner />
      </div>
    ),
  },
);

export interface VerifierBranch {
  id: string;
  name: string;
}

type CameraState = 'ready' | 'denied' | 'unavailable';

const CAMERA_COPY: Record<Exclude<CameraState, 'ready'>, string> = {
  denied:
    'No tenemos permiso para usar la cámara. Permite el acceso o pega el código del cliente.',
  unavailable:
    'No pudimos iniciar la cámara en este dispositivo. Pega el código del cliente.',
};

export function Verifier({ branches }: { branches: VerifierBranch[] }) {
  const [branchId, setBranchId] = useState<string | null>(
    branches[0]?.id ?? null,
  );
  const [camera, setCamera] = useState<CameraState>('ready');
  const [result, setResult] = useState<VerifyCouponResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [manual, setManual] = useState('');
  const [pending, startTransition] = useTransition();
  const lastToken = useRef<string | null>(null);

  const verify = (token: string) => {
    const trimmed = token.trim();
    if (!trimmed || pending || trimmed === lastToken.current) return;
    lastToken.current = trimmed;
    setError(null);
    startTransition(async () => {
      const outcome = await verifyCouponTokenAction(trimmed, branchId);
      if ('error' in outcome) {
        setError(outcome.error);
        lastToken.current = null;
      } else {
        setResult(outcome.result);
      }
    });
  };

  const reset = () => {
    setResult(null);
    setError(null);
    setManual('');
    lastToken.current = null;
  };

  const onScan = (codes: IDetectedBarcode[]) => {
    const value = codes[0]?.rawValue;
    if (value) verify(value);
  };

  const onScanError = (e: IScannerError) => {
    setCamera(e.kind === 'permission-denied' ? 'denied' : 'unavailable');
  };

  return (
    <div className="flex flex-col gap-4">
      {branches.length > 1 ? (
        <SelectField
          id="branch"
          label="Sede"
          value={branchId ?? ''}
          onChange={(e) => setBranchId(e.target.value || null)}
          options={branches.map((b) => ({ value: b.id, label: b.name }))}
        />
      ) : null}

      {result ? (
        <ResultCard result={result} onReset={reset} />
      ) : (
        <>
          {camera === 'ready' ? (
            <div className="overflow-hidden rounded-card bg-ink">
              <Scanner
                formats={['qr_code']}
                constraints={{ facingMode: 'environment' }}
                paused={pending}
                sound={false}
                onScan={onScan}
                onError={onScanError}
              />
            </div>
          ) : (
            <p
              role="status"
              className="rounded-card bg-surface-muted px-4 py-3 text-sm text-ink"
            >
              {CAMERA_COPY[camera]}
            </p>
          )}

          <FormError message={error} />

          <details
            open={camera !== 'ready'}
            className="rounded-card border border-line p-3"
          >
            <summary className="cursor-pointer text-sm font-medium text-ink">
              Pegar código manualmente
            </summary>
            <form
              className="mt-3 flex flex-col gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                verify(manual);
              }}
            >
              <TextareaField
                id="manual-token"
                label="Código del cliente"
                value={manual}
                onChange={(e) => setManual(e.target.value)}
                placeholder="dm1.…"
                autoComplete="off"
                spellCheck={false}
              />
              <Button type="submit" loading={pending} disabled={!manual.trim()}>
                Verificar
              </Button>
            </form>
          </details>
        </>
      )}
    </div>
  );
}

function ResultCard({
  result,
  onReset,
}: {
  result: VerifyCouponResult;
  onReset: () => void;
}) {
  return (
    <div
      role="status"
      className={`rounded-card p-5 text-center ${
        result.valid ? 'bg-success/10' : 'bg-danger/10'
      }`}
    >
      <p
        className={`text-2xl font-bold ${
          result.valid ? 'text-success' : 'text-danger'
        }`}
      >
        {result.valid ? 'Cupón válido' : 'Cupón no válido'}
      </p>
      {result.valid ? (
        <>
          <p className="mt-2 text-lg font-semibold text-ink">
            {result.consumer_name ?? 'Cliente'}
          </p>
          <p className="text-sm text-ink-muted">{result.coupon_title}</p>
        </>
      ) : (
        <p className="mt-2 text-sm text-ink">
          {redemptionMessage(result.reason)}
        </p>
      )}
      <Button type="button" onClick={onReset} className="mt-5 w-full">
        Escanear otro
      </Button>
    </div>
  );
}
