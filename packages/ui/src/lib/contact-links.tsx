import { CONTACT_LINKS, type ContactLink } from '@org/domain';

function ChannelIcon({ id }: { id: string }) {
  const common = {
    width: 24,
    height: 24,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  };
  switch (id) {
    case 'instagram':
      return (
        <svg {...common}>
          <rect x="3" y="3" width="18" height="18" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
        </svg>
      );
    case 'tiktok':
      return (
        <svg {...common}>
          <path d="M14 4v9.5a3.5 3.5 0 1 1-3.5-3.5" />
          <path d="M14 4c.5 2.5 2 4 4.5 4.5" />
        </svg>
      );
    case 'whatsapp':
      return (
        <svg {...common}>
          <path d="M4 20l1.3-3.9A8 8 0 1 1 8 18.7L4 20z" />
          <path d="M9.5 9.5c.3 2 2.5 4.2 4.5 4.5l1-1 2 1-.5 1.5c-3.5.5-8-4-7.5-7.5L10.5 7.5l1 2-2 0z" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="M3 7l9 6 9-6" />
        </svg>
      );
  }
}

export interface ContactLinksProps {
  links?: ReadonlyArray<ContactLink>;
  className?: string;
}

/** The channels list of the "Contacto" page; identical in both apps. */
export function ContactLinks({
  links = CONTACT_LINKS,
  className = '',
}: ContactLinksProps) {
  return (
    <ul className={`flex flex-col gap-3 ${className}`}>
      {links.map((link) => {
        const external = /^https?:/i.test(link.href);
        return (
          <li key={link.id}>
            <a
              href={link.href}
              target={external ? '_blank' : undefined}
              rel={external ? 'noopener noreferrer' : undefined}
              className="flex items-center gap-4 rounded-card border border-line bg-surface px-4 py-3 text-ink transition hover:bg-surface-muted"
            >
              <span className="text-brand-600">
                <ChannelIcon id={link.id} />
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="font-semibold">{link.label}</span>
                <span className="truncate text-sm text-ink-muted">
                  {link.description}
                </span>
              </span>
            </a>
          </li>
        );
      })}
    </ul>
  );
}
