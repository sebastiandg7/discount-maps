'use client';

import { Button, type ButtonProps } from './button';

/** Reloads the page (offline fallback, error states). */
export function ReloadButton({
  children = 'Reintentar',
  ...rest
}: Omit<ButtonProps, 'onClick' | 'type'>) {
  return (
    <Button type="button" onClick={() => window.location.reload()} {...rest}>
      {children}
    </Button>
  );
}
