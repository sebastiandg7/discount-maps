import { googleMapsDirectionsUrl, wazeUrl } from './links';

describe('googleMapsDirectionsUrl', () => {
  it('builds a directions link from coordinates', () => {
    expect(googleMapsDirectionsUrl(4.6486, -74.0628)).toBe(
      'https://www.google.com/maps/dir/?api=1&destination=4.6486%2C-74.0628',
    );
  });

  it('pins the destination to a place id when given', () => {
    const url = new URL(googleMapsDirectionsUrl(4.7, -74.1, 'ChIJ abc/1'));
    expect(url.searchParams.get('destination')).toBe('4.7,-74.1');
    expect(url.searchParams.get('destination_place_id')).toBe('ChIJ abc/1');
  });

  it('ignores an empty place id', () => {
    expect(googleMapsDirectionsUrl(1, 2, null)).not.toContain(
      'destination_place_id',
    );
    expect(googleMapsDirectionsUrl(1, 2, '')).not.toContain(
      'destination_place_id',
    );
  });
});

describe('wazeUrl', () => {
  it('builds a navigate link', () => {
    expect(wazeUrl(4.6486, -74.0628)).toBe(
      'https://waze.com/ul?ll=4.6486,-74.0628&navigate=yes',
    );
  });
});
