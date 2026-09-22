import { act, fireEvent, render, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { PlaceAutocompleteInput } from './place-autocomplete-input';

const mockFetchSuggestions = jest.fn();
const mockFetchFields = jest.fn();

const mockPlaces = {
  AutocompleteSessionToken: class {},
  AutocompleteSuggestion: {
    fetchAutocompleteSuggestions: mockFetchSuggestions,
  },
};

jest.mock('@vis.gl/react-google-maps', () => ({
  APIProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  useMapsLibrary: () => mockPlaces,
}));

function prediction(placeId: string, main: string, secondary: string) {
  return {
    placeId,
    text: { text: `${main}, ${secondary}` },
    mainText: { text: main },
    secondaryText: { text: secondary },
    toPlace: () => ({
      id: placeId,
      fetchFields: mockFetchFields,
      formattedAddress: `${main}, Bogotá, Colombia`,
      addressComponents: [{ types: ['locality'], longText: 'Bogotá' }],
      location: { lat: () => 4.6486, lng: () => -74.0628 },
    }),
  };
}

describe('PlaceAutocompleteInput', () => {
  beforeEach(() => {
    mockFetchSuggestions.mockResolvedValue({
      suggestions: [
        { placePrediction: prediction('p1', 'Cra 7 # 60-10', 'Bogotá') },
      ],
    });
    mockFetchFields.mockResolvedValue(undefined);
  });
  it('is a plain input without an API key', () => {
    const { container } = render(
      <PlaceAutocompleteInput
        id="a"
        apiKey={null}
        value="x"
        onChange={() => undefined}
        onSelect={() => undefined}
      />,
    );
    expect(container.querySelector('[role="combobox"]')).toBeNull();
    expect(container.querySelector('input')?.value).toBe('x');
  });

  it('lists suggestions and reports the selected place', async () => {
    const onSelect = jest.fn();
    const onChange = jest.fn();
    const { container, rerender } = render(
      <PlaceAutocompleteInput
        id="a"
        apiKey="k"
        value=""
        onChange={onChange}
        onSelect={onSelect}
      />,
    );
    const input = container.querySelector('input')!;
    fireEvent.change(input, { target: { value: 'cra 7' } });
    rerender(
      <PlaceAutocompleteInput
        id="a"
        apiKey="k"
        value="cra 7"
        onChange={onChange}
        onSelect={onSelect}
      />,
    );
    await waitFor(
      () =>
        expect(container.querySelectorAll('[role="option"]').length).toBe(1),
      { timeout: 2000 },
    );
    expect(mockFetchSuggestions.mock.calls[0][0]).toMatchObject({
      input: 'cra 7',
      includedRegionCodes: ['co'],
    });
    await act(async () => {
      fireEvent.click(container.querySelector('[role="option"]')!);
    });
    await waitFor(() => expect(onSelect).toHaveBeenCalled());
    expect(onSelect).toHaveBeenCalledWith({
      placeId: 'p1',
      addressLine: 'Cra 7 # 60-10',
      city: 'Bogotá',
      lat: 4.6486,
      lng: -74.0628,
    });
    expect(onChange).toHaveBeenLastCalledWith('Cra 7 # 60-10');
  });
});
