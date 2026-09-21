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

export function Brand({ subtitle }: { subtitle?: string }) {
  return (
    <div className="mb-8 text-center">
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
