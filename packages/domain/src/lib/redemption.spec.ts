import {
  ISSUE_TOKEN_ERRORS,
  ISSUE_TOKEN_FALLBACK_MESSAGE,
  REDEMPTION_REASONS,
  issueTokenErrorFromMessage,
  issueTokenErrorMessage,
  issueTokenErrorMessages,
  redemptionMessage,
  redemptionReasonMessages,
} from './redemption';

describe('redemptionMessage', () => {
  it.each(REDEMPTION_REASONS)('has Spanish copy for %s', (reason) => {
    expect(redemptionMessage(reason)).toBe(redemptionReasonMessages[reason]);
    expect(redemptionMessage(reason).length).toBeGreaterThan(0);
  });

  it('falls back for unknown reasons', () => {
    expect(redemptionMessage('SOMETHING_NEW')).toBe(
      'No fue posible verificar el cupón.',
    );
  });
});

describe('issueTokenErrorFromMessage', () => {
  it.each(ISSUE_TOKEN_ERRORS)('recognises the bare code %s', (code) => {
    expect(issueTokenErrorFromMessage(code)).toBe(code);
  });

  it('finds the code inside a longer PostgREST message', () => {
    expect(
      issueTokenErrorFromMessage(
        'P0001: SUBSCRIPTION_INACTIVE (from public.issue_coupon_token)',
      ),
    ).toBe('SUBSCRIPTION_INACTIVE');
  });

  it.each([null, undefined, '', 'permission denied for function'])(
    'returns null for %p',
    (message) => {
      expect(issueTokenErrorFromMessage(message)).toBeNull();
    },
  );
});

describe('issueTokenErrorMessage', () => {
  it('maps known codes to their copy', () => {
    expect(issueTokenErrorMessage('COUPON_UNAVAILABLE')).toBe(
      issueTokenErrorMessages.COUPON_UNAVAILABLE,
    );
  });

  it('falls back for unknown messages', () => {
    expect(issueTokenErrorMessage('network down')).toBe(
      ISSUE_TOKEN_FALLBACK_MESSAGE,
    );
  });
});
