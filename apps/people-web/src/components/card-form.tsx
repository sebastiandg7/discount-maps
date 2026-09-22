'use client';

import { useState, useTransition, type ReactNode } from 'react';
import { EncryptJWT, importSPKI } from 'jose';
import { Button, FormError, InputField } from '@org/ui';

export interface CardFormProps {
  /** Wompi sandbox/production base URL with /v1. */
  apiUrl: string;
  publicKey: string;
  /** RSA public key (PEM) for JWE tokenization; null → plain tokenization. */
  tokenizationKey: string | null;
  acceptance: { token: string; permalink: string };
  personalData: { token: string; permalink: string };
  /** Server action that turns the card token into a payment source. */
  action: (input: CardSubmission) => Promise<{ error?: string }>;
  submitLabel: string;
  /** Copy shown above the fields (price, what happens next). */
  intro: ReactNode;
}

/** What the browser hands to the server after tokenizing the card with Wompi. */
export interface CardSubmission {
  /** Card token minted in the browser with the public key (tok_test_… / tok_prod_…). */
  cardToken: string;
  acceptanceToken: string;
  acceptPersonalAuth: string;
  /** Display data from the tokenization response (fallback when Wompi omits public_data). */
  brand?: string | null;
  last4?: string | null;
}

interface CardInfo {
  number: string;
  cvc: string;
  exp_month: string;
  exp_year: string;
  card_holder: string;
}

interface TokenResponse {
  status?: string;
  data?: { id: string; brand?: string; last_four?: string };
  error?: { type?: string; messages?: Record<string, string[]> };
}

function digits(value: string): string {
  return value.replace(/\D+/g, '');
}

/** Luhn check so obvious typos never reach Wompi. */
function luhnValid(number: string): boolean {
  let sum = 0;
  let alt = false;
  for (let i = number.length - 1; i >= 0; i--) {
    let n = Number(number[i]);
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return number.length >= 13 && sum % 10 === 0;
}

function parseExpiry(value: string): { month: string; year: string } | null {
  const m = /^(\d{1,2})\s*\/\s*(\d{2}|\d{4})$/.exec(value.trim());
  if (!m) return null;
  const month = Number(m[1]);
  if (month < 1 || month > 12) return null;
  const year = m[2].length === 4 ? m[2].slice(2) : m[2];
  const exp = new Date(Date.UTC(2000 + Number(year), month, 1));
  if (exp.getTime() <= Date.now()) return null;
  return { month: String(month).padStart(2, '0'), year };
}

async function encryptCard(card: CardInfo, pem: string): Promise<string> {
  const key = await importSPKI(pem, 'RSA-OAEP-256');
  return new EncryptJWT({ ...card })
    .setProtectedHeader({ alg: 'RSA-OAEP-256', enc: 'A256GCM' })
    .encrypt(key);
}

async function tokenize(
  props: Pick<CardFormProps, 'apiUrl' | 'publicKey' | 'tokenizationKey'>,
  card: CardInfo,
): Promise<TokenResponse> {
  const body = props.tokenizationKey
    ? { payload: await encryptCard(card, props.tokenizationKey) }
    : card;
  const res = await fetch(`${props.apiUrl}/tokens/cards`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${props.publicKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  });
  return (await res.json()) as TokenResponse;
}

export function CardForm(props: CardFormProps) {
  const [holder, setHolder] = useState('');
  const [number, setNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptData, setAcceptData] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};
    const num = digits(number);
    const exp = parseExpiry(expiry);
    if (holder.trim().length < 3)
      errors.holder = 'Escribe el nombre como aparece en la tarjeta.';
    if (!luhnValid(num)) errors.number = 'Revisa el número de la tarjeta.';
    if (!exp) errors.expiry = 'Usa el formato MM/AA con una fecha futura.';
    if (!/^\d{3,4}$/.test(cvc)) errors.cvc = 'El código tiene 3 o 4 dígitos.';
    if (!acceptTerms || !acceptData)
      errors.accept = 'Debes aceptar ambos documentos.';
    setFieldErrors(errors);
    setError(null);
    if (Object.keys(errors).length || !exp) return;

    startTransition(async () => {
      let token: TokenResponse;
      try {
        token = await tokenize(props, {
          number: num,
          cvc,
          exp_month: exp.month,
          exp_year: exp.year,
          card_holder: holder.trim(),
        });
      } catch {
        setError(
          'No pudimos conectar con la pasarela de pagos. Intenta de nuevo.',
        );
        return;
      }
      if (!token.data?.id) {
        const messages = token.error?.messages
          ? Object.values(token.error.messages).flat().join(' ')
          : '';
        setError(
          messages
            ? `La pasarela rechazó la tarjeta: ${messages}`
            : 'La pasarela rechazó la tarjeta. Revisa los datos.',
        );
        return;
      }
      const result = await props.action({
        cardToken: token.data.id,
        acceptanceToken: props.acceptance.token,
        acceptPersonalAuth: props.personalData.token,
        brand: token.data.brand ?? null,
        last4: token.data.last_four ?? null,
      });
      if (result?.error) setError(result.error);
    });
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      {props.intro}
      <InputField
        id="holder"
        label="Nombre en la tarjeta"
        autoComplete="cc-name"
        value={holder}
        onChange={(e) => setHolder(e.target.value)}
        error={fieldErrors.holder}
      />
      <InputField
        id="number"
        label="Número de tarjeta"
        autoComplete="cc-number"
        inputMode="numeric"
        placeholder="0000 0000 0000 0000"
        value={number}
        onChange={(e) =>
          setNumber(
            digits(e.target.value)
              .slice(0, 19)
              .replace(/(\d{4})(?=\d)/g, '$1 '),
          )
        }
        error={fieldErrors.number}
      />
      <div className="grid grid-cols-2 gap-3">
        <InputField
          id="expiry"
          label="Vence (MM/AA)"
          autoComplete="cc-exp"
          inputMode="numeric"
          placeholder="MM/AA"
          value={expiry}
          onChange={(e) => {
            const d = digits(e.target.value).slice(0, 4);
            setExpiry(d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d);
          }}
          error={fieldErrors.expiry}
        />
        <InputField
          id="cvc"
          label="CVC"
          autoComplete="cc-csc"
          inputMode="numeric"
          type="password"
          maxLength={4}
          value={cvc}
          onChange={(e) => setCvc(digits(e.target.value).slice(0, 4))}
          error={fieldErrors.cvc}
        />
      </div>

      <label className="flex items-start gap-3 text-sm text-ink">
        <input
          type="checkbox"
          className="mt-1 size-4"
          checked={acceptTerms}
          onChange={(e) => setAcceptTerms(e.target.checked)}
        />
        <span>
          Acepto los{' '}
          <a
            href={props.acceptance.permalink}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-brand-600"
          >
            términos y condiciones
          </a>{' '}
          de Wompi.
        </span>
      </label>
      <label className="flex items-start gap-3 text-sm text-ink">
        <input
          type="checkbox"
          className="mt-1 size-4"
          checked={acceptData}
          onChange={(e) => setAcceptData(e.target.checked)}
        />
        <span>
          Autorizo el{' '}
          <a
            href={props.personalData.permalink}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-brand-600"
          >
            tratamiento de mis datos personales
          </a>
          .
        </span>
      </label>
      {fieldErrors.accept ? (
        <p role="alert" className="text-sm text-danger">
          {fieldErrors.accept}
        </p>
      ) : null}

      <FormError message={error} />
      <Button type="submit" block loading={pending}>
        {props.submitLabel}
      </Button>
      <p className="text-center text-xs text-ink-muted">
        Tus datos viajan cifrados directamente a Wompi; nunca pasan por nuestros
        servidores.
      </p>
    </form>
  );
}
