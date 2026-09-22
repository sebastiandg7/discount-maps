'use client';

import { CATEGORIES, type BusinessCategory } from '@org/domain';

export interface CategoryChipsProps {
  /** Selected category, or null for all. */
  value: BusinessCategory | null;
  onChange: (value: BusinessCategory | null) => void;
  allLabel?: string;
  className?: string;
}

const chip =
  'shrink-0 rounded-pill border px-4 py-1.5 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500';
const on = 'border-brand-500 bg-brand-500 text-white';
const off = 'border-line bg-surface text-ink hover:bg-surface-muted';

/** Horizontally scrollable category filter. */
export function CategoryChips({
  value,
  onChange,
  allLabel = 'Todas',
  className = '',
}: CategoryChipsProps) {
  const options: { id: BusinessCategory | null; label: string }[] = [
    { id: null, label: allLabel },
    ...CATEGORIES,
  ];
  return (
    <div
      role="group"
      aria-label="Categoría"
      className={`-mx-4 flex gap-2 overflow-x-auto px-4 py-1 [scrollbar-width:none] ${className}`}
    >
      {options.map((o) => {
        const selected = o.id === value;
        return (
          <button
            key={o.id ?? 'all'}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(o.id)}
            className={`${chip} ${selected ? on : off}`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
