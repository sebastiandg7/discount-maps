# @org/maps

Location helpers and Google Maps components shared by both apps, built on `@vis.gl/react-google-maps`.

- `useGeolocation`: one-shot position with the Bogotá fallback from `@org/domain` (`isFallback`, `locate()`).
- `googleMapsDirectionsUrl` / `wazeUrl`: navigation deep links (no key needed).
- `BusinessMap`: map with one pin per branch, an info window on tap (label, description, optional "Ver cupones" link) and a viewport fitted to the pins. Takes `apiKey` and `mapId` as props; without a key it renders the "Mapa no disponible" placeholder, without a Map ID it falls back from Advanced Markers to classic markers.
- `PlaceAutocompleteInput`: address input backed by Places Autocomplete (New), biased to Colombia / Bogotá. Renders only the `<input role="combobox">` and the suggestion list (wrap it in `FieldShell`); `onSelect` gives `{ placeId, addressLine, city, lat, lng }`. Without a key it is a plain input.

Each component wraps itself in `APIProvider`; pages never render two of them at once, so the script loads once. Read `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` / `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID` in a **server** component and pass them down as props.

Run `nx test @org/maps` for the unit tests (the Google library is mocked).
