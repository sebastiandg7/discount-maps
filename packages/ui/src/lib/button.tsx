import type { ButtonHTMLAttributes } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

const base =
  'inline-flex items-center justify-center gap-2 rounded-card px-5 py-3 text-base font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500';

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-brand-500 text-white hover:bg-brand-600 active:bg-brand-700',
  secondary:
    'border border-brand-500 text-brand-600 hover:bg-brand-50 active:bg-brand-100',
  ghost: 'text-ink hover:bg-surface-muted',
  danger: 'bg-danger text-white hover:opacity-90',
};

/** Class list for a button-looking element (use with next/link or <a>). */
export function buttonClassName(
  variant: ButtonVariant = 'primary',
  extra = '',
): string {
  return `${base} ${variants[variant]} ${extra}`.trim();
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  loading?: boolean;
  block?: boolean;
}

export function Button({
  variant = 'primary',
  loading = false,
  block = false,
  className = '',
  children,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={buttonClassName(
        variant,
        `${block ? 'w-full' : ''} ${className}`,
      )}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <Spinner /> : null}
      {children}
    </button>
  );
}

export function Spinner({ className = '' }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="Cargando"
      className={`inline-block size-4 animate-spin rounded-full border-2 border-current border-t-transparent ${className}`}
    />
  );
}
