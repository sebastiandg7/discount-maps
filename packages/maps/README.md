# @org/maps

Location helpers shared by both apps: `useGeolocation` (one-shot position with the Bogotá fallback from `@org/domain`), `googleMapsDirectionsUrl` / `wazeUrl` deep links, and `BusinessMap`.

`BusinessMap` is a placeholder until the Google Maps key exists; it already takes the final props (`center`, `markers`, `apiKey`) so the `@vis.gl/react-google-maps` implementation can replace its body without touching the apps.

Run `nx test @org/maps` for the unit tests.
