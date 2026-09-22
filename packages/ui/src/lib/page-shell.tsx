import type { ReactNode } from 'react';

/** Mobile-first page container: full height, centered column, safe-area padding. */
export function PageShell({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <main
      className={`mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] ${className}`}
    >
      {children}
    </main>
  );
}

export interface TopBarProps {
  title?: string;
  /** Rendered at the top-left (usually a back link). */
  left?: ReactNode;
  /** Rendered at the top-right (e.g. a notifications toggle). */
  right?: ReactNode;
}

export function TopBar({ title, left, right }: TopBarProps) {
  return (
    <header className="mb-4 grid h-12 grid-cols-[3rem_1fr_3rem] items-center">
      <div className="flex justify-start">{left}</div>
      <h1 className="truncate text-center text-lg font-semibold text-ink">
        {title}
      </h1>
      <div className="flex justify-end">{right}</div>
    </header>
  );
}

export function BackIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M15 18l-6-6 6-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** The map-pin mark used by the landing pages and the app icons (scripts/generate-icons.mjs). */
export function BrandMark({ className = 'size-12' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M32 3C19.3 3 9 13.2 9 25.9c0 16.6 20.4 33.6 21.3 34.3a2.6 2.6 0 0 0 3.4 0C34.6 59.5 55 42.5 55 25.9 55 13.2 44.7 3 32 3z"
        fill="currentColor"
      />
      <circle
        cx="25.5"
        cy="20"
        r="4"
        fill="none"
        stroke="#fff"
        strokeWidth="2.6"
      />
      <circle
        cx="38.5"
        cy="32"
        r="4"
        fill="none"
        stroke="#fff"
        strokeWidth="2.6"
      />
      <path
        d="M39.5 16.5 24.5 35.5"
        stroke="#fff"
        strokeWidth="2.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Brand({
  subtitle,
  mark = true,
}: {
  subtitle?: string;
  mark?: boolean;
}) {
  return (
    <div className="mb-8 text-center">
      {mark ? (
        <BrandMark className="mx-auto mb-2 size-12 text-brand-500" />
      ) : null}
      <p className="text-3xl font-bold text-brand-600">Discount Maps</p>
      {subtitle ? <p className="mt-1 text-ink-muted">{subtitle}</p> : null}
    </div>
  );
}

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="my-12 text-center">
      <p className="text-lg font-semibold text-ink">{title}</p>
      {description ? (
        <p className="mt-1 text-ink-muted">{description}</p>
      ) : null}
    </div>
  );
}
