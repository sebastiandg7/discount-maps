import { render } from '@testing-library/react';
import { QrCode } from './qr-code';

describe('QrCode', () => {
  it('renders an SVG with an accessible title', () => {
    const { container } = render(
      <QrCode value="dm1.a.b.c.d.e" title="Código de prueba" />,
    );
    const svg = container.querySelector('svg');
    expect(svg).toBeTruthy();
    expect(svg?.querySelector('title')?.textContent).toBe('Código de prueba');
  });
});
