import type { ComponentType, ReactNode } from 'react';

export interface BottomNavItem {
  href: string;
  label: string;
  icon: ReactNode;
}

export interface BottomNavLinkProps {
  href: string;
  className?: string;
  children: ReactNode;
  'aria-current'?: 'page';
}

export interface BottomNavProps {
  items: readonly BottomNavItem[];
  /** Current pathname (apps pass `usePathname()`). */
  currentPath: string;
  /** Link renderer; apps pass `next/link`. Defaults to a plain anchor. */
  LinkComponent?: ComponentType<BottomNavLinkProps>;
}

function Anchor({ href, className, children, ...rest }: BottomNavLinkProps) {
  return (
    <a href={href} className={className} {...rest}>
      {children}
    </a>
  );
}

function isActive(currentPath: string, href: string): boolean {
  return currentPath === href || currentPath.startsWith(`${href}/`);
}

/** Fixed bottom tab bar for the mobile shell. Reserve space with `pb-20` on the page. */
export function BottomNav({
  items,
  currentPath,
  LinkComponent = Anchor,
}: BottomNavProps) {
  return (
    <nav
      aria-label="Principal"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto grid w-full max-w-md grid-flow-col auto-cols-fr">
        {items.map((item) => {
          const active = isActive(currentPath, item.href);
          return (
            <li key={item.href}>
              <LinkComponent
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`flex flex-col items-center gap-0.5 px-2 py-2 text-xs font-medium ${
                  active ? 'text-brand-600' : 'text-ink-muted'
                } focus-visible:outline-2 focus-visible:outline-brand-500`}
              >
                <span aria-hidden="true">{item.icon}</span>
                {item.label}
              </LinkComponent>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

const iconProps = {
  width: 24,
  height: 24,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
} as const;

export function MapIcon() {
  return (
    <svg {...iconProps}>
      <path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Z" />
      <path d="M9 4v14M15 6v14" />
    </svg>
  );
}

export function ChatIcon() {
  return (
    <svg {...iconProps}>
      <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12Z" />
    </svg>
  );
}

export function UserIcon() {
  return (
    <svg {...iconProps}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </svg>
  );
}

export function QrIcon() {
  return (
    <svg {...iconProps}>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <path d="M14 14h3v3h-3zM20 14v.01M17 20h3M14 20v.01M20 17v.01" />
    </svg>
  );
}
