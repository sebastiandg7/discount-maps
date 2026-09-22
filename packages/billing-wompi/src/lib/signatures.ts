import { createHash, timingSafeEqual } from 'node:crypto';
import type { WompiEvent } from './types';

export function sha256Hex(input: string): string {
  return createHash('sha256').update(input, 'utf8').digest('hex');
}

/**
 * Integrity signature for a transaction:
 * SHA256("<reference><amount_in_cents><currency>[<expiration_time>]<integrity_secret>").
 */
export function integritySignature(
  reference: string,
  amountInCents: number,
  currency: string,
  integritySecret: string,
  expirationTime?: string,
): string {
  return sha256Hex(
    `${reference}${amountInCents}${currency}${expirationTime ?? ''}${integritySecret}`,
  );
}

/** Reads `a.b.c` from a nested object; undefined when any step is missing. */
export function getByPath(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc === null || typeof acc !== 'object') return undefined;
    return (acc as Record<string, unknown>)[key];
  }, obj);
}

/**
 * Event checksum: SHA256 of the values named in `signature.properties`
 * (resolved against `data`, in order) + `timestamp` + the events secret.
 */
export function eventChecksum(event: WompiEvent, eventsSecret: string): string {
  const values = event.signature.properties.map((p) => {
    const v = getByPath(event.data, p);
    return v == null ? '' : String(v);
  });
  return sha256Hex(`${values.join('')}${event.timestamp}${eventsSecret}`);
}

function safeEqualHex(a: string, b: string): boolean {
  const x = Buffer.from(a.toLowerCase(), 'utf8');
  const y = Buffer.from(b.toLowerCase(), 'utf8');
  return x.length === y.length && timingSafeEqual(x, y);
}

/**
 * True when the checksum embedded in the event (and the `X-Event-Checksum`
 * header, when given) matches what the events secret produces.
 */
export function verifyEventChecksum(
  event: WompiEvent,
  eventsSecret: string,
  headerChecksum?: string | null,
): boolean {
  const expected = eventChecksum(event, eventsSecret);
  if (!safeEqualHex(expected, event.signature?.checksum ?? '')) return false;
  if (headerChecksum != null && !safeEqualHex(expected, headerChecksum)) {
    return false;
  }
  return true;
}
