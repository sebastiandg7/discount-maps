'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BottomNav,
  ChatIcon,
  MapIcon,
  UserIcon,
  type BottomNavLinkProps,
} from '@org/ui';

const ITEMS = [
  { href: '/mapas', label: 'Mapas', icon: <MapIcon /> },
  { href: '/contacto', label: 'Contacto', icon: <ChatIcon /> },
  { href: '/cuenta', label: 'Cuenta', icon: <UserIcon /> },
] as const;

function NavLink({ href, children, ...rest }: BottomNavLinkProps) {
  return (
    <Link href={href} {...rest}>
      {children}
    </Link>
  );
}

export function PeopleBottomNav() {
  const pathname = usePathname();
  return (
    <BottomNav items={ITEMS} currentPath={pathname} LinkComponent={NavLink} />
  );
}
