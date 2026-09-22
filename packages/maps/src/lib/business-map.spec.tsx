import { fireEvent, render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { BusinessMap } from './business-map';

jest.mock('@vis.gl/react-google-maps', () => ({
  APIProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  Map: ({ children }: { children: ReactNode }) => (
    <div data-testid="map">{children}</div>
  ),
  AdvancedMarker: ({
    title,
    onClick,
    children,
  }: {
    title: string;
    onClick: () => void;
    children: ReactNode;
  }) => (
    <button type="button" data-marker={title} onClick={onClick}>
      {children}
    </button>
  ),
  Marker: ({ title, onClick }: { title: string; onClick: () => void }) => (
    <button type="button" data-marker={title} onClick={onClick} />
  ),
  Pin: () => <span data-pin />,
  InfoWindow: ({ children }: { children: ReactNode }) => (
    <div role="dialog">{children}</div>
  ),
  useMap: () => null,
}));

const center = { lat: 4.711, lng: -74.0721 };
const markers = [
  { id: 'a', lat: 4.65, lng: -74.06, label: 'Sede Chapinero', href: '/x' },
  { id: 'b', lat: 4.7, lng: -74.03, label: 'Sede Usaquén' },
];

describe('BusinessMap', () => {
  it('renders the placeholder without an API key', () => {
    const { container } = render(
      <BusinessMap center={center} markers={markers} apiKey={null} />,
    );
    const box = container.querySelector('[role="img"]');
    expect(box?.getAttribute('aria-label')).toBe('Mapa no disponible');
    expect(box?.textContent).toContain('2 sedes');
  });

  it('renders one branded pin per marker with a map id', () => {
    const { container } = render(
      <BusinessMap center={center} markers={markers} apiKey="k" mapId="m" />,
    );
    expect(container.querySelectorAll('[data-marker]').length).toBe(2);
    expect(container.querySelectorAll('[data-pin]').length).toBe(2);
  });

  it('falls back to classic markers without a map id and opens the info window', () => {
    const { container } = render(
      <BusinessMap center={center} markers={markers} apiKey="k" />,
    );
    expect(container.querySelectorAll('[data-pin]').length).toBe(0);
    fireEvent.click(container.querySelector('[data-marker="Sede Chapinero"]')!);
    const dialog = container.querySelector('[role="dialog"]');
    expect(dialog?.textContent).toContain('Sede Chapinero');
    expect(dialog?.querySelector('a')?.getAttribute('href')).toBe('/x');
  });
});
