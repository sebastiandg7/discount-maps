import Link from 'next/link';
import { Brand, Button, PageShell, buttonClassName } from '@org/ui';
import { signOutAction } from '../../../auth/actions';

const MENU = [
  {
    href: '/cupones',
    label: 'Cupones',
    description: 'Crea y administra tus cupones',
  },
  {
    href: '/verificar',
    label: 'Verificar cliente',
    description: 'Escanea el código del cliente',
  },
  { href: '/contacto', label: 'Contacto', description: 'Escríbenos' },
  { href: '/cuenta', label: 'Cuenta', description: 'Datos de tu empresa' },
] as const;

export default function HomePage() {
  return (
    <PageShell className="justify-center">
      <Brand subtitle="Portal para empresas" />
      <nav className="flex flex-col gap-3">
        {MENU.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={buttonClassName('primary', 'flex-col gap-0 py-4')}
          >
            <span className="text-lg">{item.label}</span>
            <span className="text-sm font-normal opacity-80">
              {item.description}
            </span>
          </Link>
        ))}
      </nav>
      <form action={signOutAction} className="mt-8">
        <Button type="submit" variant="ghost" block>
          Cerrar sesión
        </Button>
      </form>
    </PageShell>
  );
}
