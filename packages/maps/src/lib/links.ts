/** Deep links that open native navigation apps from a branch's coordinates. */

function coords(lat: number, lng: number): string {
  return `${lat},${lng}`;
}

/** Google Maps directions to the point (optionally pinned to a Place ID). */
export function googleMapsDirectionsUrl(
  lat: number,
  lng: number,
  placeId?: string | null,
): string {
  const params = new URLSearchParams({
    api: '1',
    destination: coords(lat, lng),
  });
  if (placeId) params.set('destination_place_id', placeId);
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

/** Waze universal link that starts navigation to the point. */
export function wazeUrl(lat: number, lng: number): string {
  return `https://waze.com/ul?ll=${coords(lat, lng)}&navigate=yes`;
}
