import { render, screen } from '@testing-library/react';
import {
  BottomNav,
  ChatIcon,
  MapIcon,
  type BottomNavLinkProps,
} from './bottom-nav';

const items = [
  { href: '/mapas', label: 'Mapas', icon: <MapIcon /> },
  { href: '/contacto', label: 'Contacto', icon: <ChatIcon /> },
];

describe('BottomNav', () => {
  it('marks the current section, including nested paths', () => {
    render(<BottomNav items={items} currentPath="/mapas/detalle" />);
    const mapas = screen.getByRole('link', { name: 'Mapas' });
    const contacto = screen.getByRole('link', { name: 'Contacto' });
    expect(mapas.getAttribute('aria-current')).toBe('page');
    expect(contacto.getAttribute('aria-current')).toBeNull();
  });

  it('renders through a custom link component', () => {
    function FakeLink({ href, children, ...rest }: BottomNavLinkProps) {
      return (
        <a href={href} data-fake="1" {...rest}>
          {children}
        </a>
      );
    }
    render(
      <BottomNav items={items} currentPath="/x" LinkComponent={FakeLink} />,
    );
    expect(document.querySelectorAll('a[data-fake="1"]').length).toBe(2);
  });
});
