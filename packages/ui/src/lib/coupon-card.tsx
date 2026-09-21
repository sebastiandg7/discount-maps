import type { ReactNode } from 'react';
import { formatDiscount, type DiscountType } from '@org/domain';

export interface CouponCardCoupon {
  title: string;
  description?: string | null;
  discount_type: DiscountType;
  discount_value?: number | null;
  image_url?: string | null;
  valid_until?: string | null;
  is_active?: boolean;
}

export interface CouponCardBusiness {
  display_name: string;
  logo_url?: string | null;
}

export interface CouponCardProps {
  coupon: CouponCardCoupon;
  business?: CouponCardBusiness;
  /** Marks the card as a live preview (merchant editor). */
  preview?: boolean;
  /** Renders the card as a link. */
  href?: string;
  /** Extra content under the description (e.g. actions). */
  footer?: ReactNode;
  className?: string;
}

const dateFormatter = new Intl.DateTimeFormat('es-CO', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

/**
 * The one coupon card. The merchant editor renders it as a live preview and the
 * consumer app renders the exact same component, so what merchants see is what
 * customers get.
 */
export function CouponCard({
  coupon,
  business,
  preview = false,
  href,
  footer,
  className = '',
}: CouponCardProps) {
  const title = coupon.title.trim() || 'Título del cupón';
  const headline = formatDiscount(coupon.discount_type, coupon.discount_value);
  const inactive = coupon.is_active === false;
  const validUntil = coupon.valid_until ? new Date(coupon.valid_until) : null;

  const body = (
    <article
      aria-label={title}
      className={`relative overflow-hidden rounded-card border border-line bg-surface shadow-sm ${
        inactive ? 'opacity-60' : ''
      } ${className}`}
    >
      {coupon.image_url ? (
        <img
          src={coupon.image_url}
          alt=""
          className="aspect-[2/1] w-full object-cover"
        />
      ) : (
        <div className="flex aspect-[2/1] w-full items-center justify-center bg-gradient-to-br from-brand-500 to-brand-700 px-4 text-center">
          <span className="text-3xl font-extrabold leading-tight text-white drop-shadow">
            {headline}
          </span>
        </div>
      )}
      {preview ? (
        <span className="absolute left-3 top-3 rounded-pill bg-ink/70 px-2 py-0.5 text-xs font-medium text-white">
          Vista previa
        </span>
      ) : null}
      {inactive ? (
        <span className="absolute right-3 top-3 rounded-pill bg-surface px-2 py-0.5 text-xs font-medium text-ink-muted">
          Inactivo
        </span>
      ) : null}
      <div className="flex flex-col gap-2 p-4">
        {business ? (
          <div className="flex items-center gap-2">
            {business.logo_url ? (
              <img
                src={business.logo_url}
                alt=""
                className="size-6 rounded-full object-cover"
              />
            ) : (
              <span className="flex size-6 items-center justify-center rounded-full bg-surface-muted text-xs font-semibold text-ink-muted">
                {business.display_name.slice(0, 1)}
              </span>
            )}
            <span className="truncate text-sm text-ink-muted">
              {business.display_name}
            </span>
          </div>
        ) : null}
        {coupon.image_url ? (
          <p className="text-lg font-bold text-brand-600">{headline}</p>
        ) : null}
        <h3 className="text-lg font-semibold leading-snug text-ink">{title}</h3>
        {coupon.description ? (
          <p className="line-clamp-2 text-sm text-ink-muted">
            {coupon.description}
          </p>
        ) : null}
        {validUntil && !Number.isNaN(validUntil.getTime()) ? (
          <p className="text-xs text-ink-muted">
            Válido hasta {dateFormatter.format(validUntil)}
          </p>
        ) : null}
        {footer}
      </div>
    </article>
  );

  return href ? (
    <a
      href={href}
      className="block focus-visible:outline-2 focus-visible:outline-brand-500"
    >
      {body}
    </a>
  ) : (
    body
  );
}
