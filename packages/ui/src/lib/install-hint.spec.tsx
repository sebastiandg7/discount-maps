import { act, fireEvent, render } from '@testing-library/react';
import { InstallHint } from './install-hint';

describe('InstallHint', () => {
  beforeEach(() => {
    localStorage.clear();
    window.matchMedia = jest.fn().mockReturnValue({ matches: false });
  });

  it('renders nothing until the browser offers to install', () => {
    const { container } = render(<InstallHint />);
    expect(container.querySelector('aside')).toBeNull();
  });

  it('shows the install button after beforeinstallprompt and hides on "Ahora no"', () => {
    const { container, getByText } = render(<InstallHint storageKey="t" />);
    act(() => {
      window.dispatchEvent(new Event('beforeinstallprompt'));
    });
    expect(container.querySelector('aside')?.textContent).toContain(
      'Instalar la app',
    );
    fireEvent.click(getByText('Ahora no'));
    expect(container.querySelector('aside')).toBeNull();
    expect(localStorage.getItem('t')).not.toBeNull();
  });

  it('explains the home-screen steps on iOS Safari', () => {
    const ua = jest
      .spyOn(navigator, 'userAgent', 'get')
      .mockReturnValue(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1',
      );
    const { container } = render(<InstallHint />);
    expect(container.querySelector('aside')?.textContent).toContain(
      'Añadir a pantalla de inicio',
    );
    ua.mockRestore();
  });
});
