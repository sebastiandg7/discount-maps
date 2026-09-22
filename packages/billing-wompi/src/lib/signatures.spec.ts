import {
  eventChecksum,
  getByPath,
  integritySignature,
  sha256Hex,
  verifyEventChecksum,
} from './signatures';
import type { WompiEvent } from './types';

describe('integritySignature', () => {
  it('matches the documented example', () => {
    expect(
      integritySignature(
        'sk8-438k4-xmxm392-sn2m',
        2490000,
        'COP',
        'prod_integrity_Z5mMke9x0k8gpErbDqwrJXMqsI6SFli6',
      ),
    ).toBe('37c8407747e595535433ef8f6a811d853cd943046624a0ec04662b17bbf33bf5');
  });

  it('appends the expiration time before the secret when given', () => {
    expect(
      integritySignature(
        'ref',
        100,
        'COP',
        'secret',
        '2023-06-09T20:28:50.000Z',
      ),
    ).toBe(sha256Hex('ref100COP2023-06-09T20:28:50.000Zsecret'));
  });
});

const SECRET = 'prod_events_OcHnIzeBl5socpwByQ4hA52Em3USQ93Z';

function event(overrides: Partial<WompiEvent> = {}): WompiEvent {
  return {
    event: 'transaction.updated',
    data: {
      transaction: {
        id: '1234-1610641025-49201',
        created_at: '2021-01-14T16:17:05.000Z',
        amount_in_cents: 4490000,
        reference: 'MZQ3X2DE2SMX',
        currency: 'COP',
        customer_email: 'juan.perez@gmail.com',
        payment_method_type: 'NEQUI',
        status: 'APPROVED',
        status_message: null,
      },
    },
    environment: 'prod',
    signature: {
      properties: [
        'transaction.id',
        'transaction.status',
        'transaction.amount_in_cents',
      ],
      // The docs print an illustrative hash that is not the SHA256 of their own
      // example string; the formula is what matters, so derive the fixture.
      checksum: sha256Hex(
        `1234-1610641025-49201APPROVED44900001530291411${SECRET}`,
      ).toUpperCase(),
    },
    timestamp: 1530291411,
    sent_at: '2018-07-20T16:45:05.000Z',
    ...overrides,
  };
}

describe('eventChecksum', () => {
  it('concatenates the signed properties, the timestamp and the secret', () => {
    expect(eventChecksum(event(), SECRET)).toBe(
      sha256Hex(`1234-1610641025-49201APPROVED44900001530291411${SECRET}`),
    );
  });

  it('treats missing properties as empty strings', () => {
    const e = event({
      signature: {
        properties: ['transaction.nope', 'transaction.status'],
        checksum: '',
      },
    });
    expect(eventChecksum(e, SECRET)).toBe(
      sha256Hex(`APPROVED1530291411${SECRET}`),
    );
  });
});

describe('verifyEventChecksum', () => {
  it('accepts a genuine event and its header', () => {
    const e = event();
    expect(verifyEventChecksum(e, SECRET)).toBe(true);
    expect(verifyEventChecksum(e, SECRET, e.signature.checksum)).toBe(true);
    expect(
      verifyEventChecksum(e, SECRET, e.signature.checksum.toLowerCase()),
    ).toBe(true);
  });

  it('rejects a tampered amount', () => {
    const e = event();
    e.data.transaction!.amount_in_cents = 100;
    expect(verifyEventChecksum(e, SECRET)).toBe(false);
  });

  it('rejects the wrong secret and a mismatching header', () => {
    expect(verifyEventChecksum(event(), 'other')).toBe(false);
    expect(verifyEventChecksum(event(), SECRET, 'deadbeef')).toBe(false);
  });
});

describe('getByPath', () => {
  it('walks nested objects and tolerates missing steps', () => {
    expect(getByPath({ a: { b: { c: 1 } } }, 'a.b.c')).toBe(1);
    expect(getByPath({ a: null }, 'a.b')).toBeUndefined();
    expect(getByPath(undefined, 'a')).toBeUndefined();
  });
});
