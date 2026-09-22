/// <reference types="google.maps" />
'use client';

import {
  useEffect,
  useId,
  useRef,
  useState,
  type InputHTMLAttributes,
} from 'react';
import { APIProvider, useMapsLibrary } from '@vis.gl/react-google-maps';
import { DEFAULT_MAP_CENTER } from '@org/domain';

/** What the merchant picked, ready for `branchSchema`. */
export interface SelectedPlace {
  placeId: string;
  /** Street address without the city / country suffix. */
  addressLine: string;
  city: string;
  lat: number;
  lng: number;
}

export interface PlaceAutocompleteInputProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'value' | 'onChange' | 'onSelect'
> {
  id: string;
  /** Without a key the field is a plain text input (manual address). */
  apiKey?: string | null;
  value: string;
  onChange: (text: string) => void;
  onSelect: (place: SelectedPlace) => void;
  /** Bias suggestions around this point (defaults to Bogotá). */
  bias?: { lat: number; lng: number };
  className?: string;
}

interface Suggestion {
  id: string;
  main: string;
  secondary: string;
  prediction: google.maps.places.PlacePrediction;
}

const DEBOUNCE_MS = 250;
const BIAS_RADIUS_M = 50_000;

function componentText(
  components: google.maps.places.AddressComponent[] | null | undefined,
  type: string,
): string {
  return components?.find((c) => c.types.includes(type))?.longText ?? '';
}

/** "Cra 7 # 60-10, Bogotá, Colombia" → "Cra 7 # 60-10". */
function stripLocality(formatted: string, city: string): string {
  const parts = formatted.split(',').map((p) => p.trim());
  const cut = parts.findIndex(
    (p) => p === city || /^colombia$/i.test(p) || /^bogot[aá]/i.test(p),
  );
  return (cut > 0 ? parts.slice(0, cut) : parts).join(', ');
}

function AutocompleteField({
  apiKey: _apiKey,
  value,
  onChange,
  onSelect,
  bias = DEFAULT_MAP_CENTER,
  className = '',
  id,
  ...rest
}: PlaceAutocompleteInputProps) {
  const places = useMapsLibrary('places');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const token = useRef<google.maps.places.AutocompleteSessionToken | null>(
    null,
  );
  const skipNext = useRef(false);
  const listId = useId();

  useEffect(() => {
    if (!places || !open) return;
    if (skipNext.current) {
      skipNext.current = false;
      return;
    }
    const input = value.trim();
    if (input.length < 3) {
      setSuggestions([]);
      return;
    }
    let cancelled = false;
    const handle = setTimeout(async () => {
      try {
        token.current ??= new places.AutocompleteSessionToken();
        const { suggestions: found } =
          await places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
            input,
            sessionToken: token.current,
            includedRegionCodes: ['co'],
            language: 'es-CO',
            locationBias: { center: bias, radius: BIAS_RADIUS_M },
          });
        if (cancelled) return;
        setSuggestions(
          found
            .map((s) => s.placePrediction)
            .filter((p): p is google.maps.places.PlacePrediction => !!p)
            .map((p) => ({
              id: p.placeId,
              main: p.mainText?.text ?? p.text.text,
              secondary: p.secondaryText?.text ?? '',
              prediction: p,
            })),
        );
        setActive(-1);
      } catch (error) {
        console.error('[maps] autocomplete failed', error);
        if (!cancelled) setSuggestions([]);
      }
    }, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
    // bias is a plain object recreated by callers; compare by value
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [places, value, open, bias.lat, bias.lng]);

  const choose = async (s: Suggestion) => {
    if (!places) return;
    setOpen(false);
    setSuggestions([]);
    try {
      const place = s.prediction.toPlace();
      await place.fetchFields({
        fields: ['location', 'formattedAddress', 'addressComponents'],
      });
      token.current = null; // a selection ends the billing session
      const city =
        componentText(place.addressComponents, 'locality') ||
        componentText(place.addressComponents, 'administrative_area_level_2') ||
        componentText(place.addressComponents, 'administrative_area_level_1');
      const formatted = place.formattedAddress ?? s.main;
      const addressLine = stripLocality(formatted, city) || s.main;
      const lat = place.location?.lat();
      const lng = place.location?.lng();
      skipNext.current = true;
      onChange(addressLine);
      if (lat == null || lng == null) return;
      onSelect({ placeId: place.id, addressLine, city, lat, lng });
    } catch (error) {
      console.error('[maps] place details failed', error);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => (i + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (e.key === 'Enter' && active >= 0) {
      e.preventDefault();
      void choose(suggestions[active]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const showList = open && suggestions.length > 0;
  return (
    <div className="relative">
      <input
        id={id}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={showList}
        aria-controls={listId}
        aria-activedescendant={
          active >= 0 ? `${listId}-${suggestions[active].id}` : undefined
        }
        autoComplete="off"
        className={className}
        value={value}
        onChange={(e) => {
          setOpen(true);
          onChange(e.target.value);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={onKeyDown}
        {...rest}
      />
      {showList ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 z-20 mt-1 max-h-64 overflow-auto rounded-card border border-line bg-surface py-1 shadow-lg"
        >
          {suggestions.map((s, i) => (
            <li
              key={s.id}
              id={`${listId}-${s.id}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => void choose(s)}
              className={`cursor-pointer px-4 py-2 text-sm ${
                i === active ? 'bg-brand-50 text-brand-700' : 'text-ink'
              }`}
            >
              <span className="block font-medium">{s.main}</span>
              {s.secondary ? (
                <span className="block text-xs text-ink-muted">
                  {s.secondary}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/**
 * Address input backed by Places Autocomplete (New). Picking a suggestion
 * fills address, city and coordinates through `onSelect`; the merchant can
 * still type freely and set coordinates by hand. Wrap it with `FieldShell`
 * (or any label) in the app; it renders only the input and the list.
 */
export function PlaceAutocompleteInput(props: PlaceAutocompleteInputProps) {
  if (!props.apiKey) {
    const {
      apiKey: _apiKey,
      onSelect: _onSelect,
      bias: _bias,
      value,
      onChange,
      className,
      ...rest
    } = props;
    return (
      <input
        className={className}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        {...rest}
      />
    );
  }
  return (
    <APIProvider apiKey={props.apiKey} language="es" region="CO">
      <AutocompleteField {...props} />
    </APIProvider>
  );
}
