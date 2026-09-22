import { formatDate } from './dates';

describe('formatDate', () => {
  it('formats in Bogotá time with the es-CO long form', () => {
    // 04:00Z on the 22nd is 23:00 on the 21st in Bogotá (UTC-5).
    expect(formatDate('2026-10-22T04:00:00Z')).toBe('21 de octubre de 2026');
    expect(formatDate(new Date('2026-10-22T12:00:00Z'))).toBe(
      '22 de octubre de 2026',
    );
  });

  it('returns an empty string for missing or invalid values', () => {
    expect(formatDate(null)).toBe('');
    expect(formatDate('nope')).toBe('');
  });
});
