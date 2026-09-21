'use client';

import { useState, useTransition } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  couponSchema,
  DISCOUNT_TYPES,
  discountTypeLabels,
  type CouponInput,
} from '@org/domain';
import {
  Button,
  CouponCard,
  FormError,
  InputField,
  SelectField,
  TextareaField,
  Toggle,
} from '@org/ui';
import {
  deleteCouponAction,
  saveCouponAction,
  type CouponActionResult,
} from './actions';

export interface CouponFormProps {
  business: { display_name: string; logo_url: string | null };
  /** Existing coupon when editing. */
  coupon?: {
    id: string;
    title: string;
    description: string | null;
    discount_type: CouponInput['discountType'];
    discount_value: number | null;
    terms: string | null;
    image_url: string | null;
    is_active: boolean;
    valid_from: string | null;
    valid_until: string | null;
  };
  /** When false the "active" switch cannot be turned off (minimum reached). */
  canDeactivate: boolean;
}

const toDateInput = (iso: string | null) => (iso ? iso.slice(0, 10) : '');

export function CouponForm({
  business,
  coupon,
  canDeactivate,
}: CouponFormProps) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<CouponActionResult>({});
  const [isActive, setIsActive] = useState(coupon?.is_active ?? true);
  const [imagePreview, setImagePreview] = useState<string | null>(
    coupon?.image_url ?? null,
  );

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<CouponInput>({
    resolver: zodResolver(couponSchema),
    mode: 'onChange',
    defaultValues: {
      title: coupon?.title ?? '',
      description: coupon?.description ?? '',
      discountType: coupon?.discount_type ?? 'percentage',
      discountValue: coupon?.discount_value ?? null,
      terms: coupon?.terms ?? '',
      validFrom: toDateInput(coupon?.valid_from ?? null),
      validUntil: toDateInput(coupon?.valid_until ?? null),
    },
  });

  // Live preview: every keystroke re-renders the same CouponCard customers will see.
  const draft = useWatch({ control });
  const needsValue =
    draft.discountType === 'percentage' || draft.discountType === 'fixed';

  const onSubmit = handleSubmit((values) => {
    const fd = new FormData();
    fd.set('couponId', coupon?.id ?? '');
    fd.set('title', values.title);
    fd.set('description', values.description ?? '');
    fd.set('discountType', values.discountType);
    fd.set(
      'discountValue',
      values.discountValue == null ? '' : String(values.discountValue),
    );
    fd.set('terms', values.terms ?? '');
    fd.set('validFrom', values.validFrom ?? '');
    fd.set('validUntil', values.validUntil ?? '');
    fd.set('isActive', String(isActive));
    const file = (document.getElementById('image') as HTMLInputElement | null)
      ?.files?.[0];
    if (file) fd.set('image', file);
    startTransition(async () => {
      const r = await saveCouponAction(fd);
      if (r) setResult(r);
    });
  });

  const fieldError = (name: keyof CouponInput) =>
    errors[name]?.message ?? result.fieldErrors?.[name];

  return (
    <div className="flex flex-col gap-6">
      <CouponCard
        preview
        business={business}
        coupon={{
          title: draft.title ?? '',
          description: draft.description,
          discount_type: draft.discountType ?? 'percentage',
          discount_value: needsValue ? draft.discountValue : null,
          image_url: imagePreview,
          valid_until: draft.validUntil || null,
          is_active: isActive,
        }}
      />

      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <InputField
          id="title"
          label="Título"
          placeholder="Ej. 2x1 en pizzas los martes"
          maxLength={60}
          error={fieldError('title')}
          {...register('title')}
        />
        <SelectField
          id="discountType"
          label="Tipo de descuento"
          options={DISCOUNT_TYPES.map((t) => ({
            value: t,
            label: discountTypeLabels[t],
          }))}
          error={fieldError('discountType')}
          {...register('discountType')}
        />
        {needsValue ? (
          <InputField
            id="discountValue"
            label={
              draft.discountType === 'percentage'
                ? 'Porcentaje (1–100)'
                : 'Monto en pesos'
            }
            type="number"
            inputMode="numeric"
            min={draft.discountType === 'percentage' ? 1 : 1}
            max={draft.discountType === 'percentage' ? 100 : undefined}
            error={fieldError('discountValue')}
            {...register('discountValue', {
              setValueAs: (v) => (v === '' || v == null ? null : Number(v)),
            })}
          />
        ) : null}
        <TextareaField
          id="description"
          label="Descripción"
          hint="Qué incluye la promoción. Se muestra en la tarjeta."
          maxLength={500}
          error={fieldError('description')}
          {...register('description')}
        />
        <TextareaField
          id="terms"
          label="Términos y condiciones"
          hint="Restricciones, horarios, exclusiones."
          maxLength={1000}
          error={fieldError('terms')}
          {...register('terms')}
        />
        <div className="grid grid-cols-2 gap-3">
          <InputField
            id="validFrom"
            label="Válido desde"
            type="date"
            error={fieldError('validFrom')}
            {...register('validFrom')}
          />
          <InputField
            id="validUntil"
            label="Válido hasta"
            type="date"
            error={fieldError('validUntil')}
            {...register('validUntil')}
          />
        </div>
        <InputField
          id="image"
          name="image"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          label="Imagen (opcional)"
          hint="PNG, JPG o WebP. Máximo 2 MB. Sin imagen se muestra el descuento en grande."
          error={result.fieldErrors?.image}
          onChange={(e) => {
            const f = e.target.files?.[0];
            setImagePreview(
              f ? URL.createObjectURL(f) : (coupon?.image_url ?? null),
            );
          }}
        />
        <div className="flex items-center justify-between rounded-card border border-line p-4">
          <div>
            <p className="font-medium text-ink">Cupón activo</p>
            <p className="text-sm text-ink-muted">
              {isActive
                ? 'Visible para los clientes.'
                : 'Guardado pero oculto.'}
            </p>
          </div>
          <Toggle
            label="Cupón activo"
            hideLabel
            checked={isActive}
            disabled={isActive && !canDeactivate}
            onChange={setIsActive}
          />
        </div>
        {isActive && !canDeactivate ? (
          <p className="text-xs text-ink-muted">
            Activa otro cupón antes de desactivar este: debes mantener al menos
            3 activos.
          </p>
        ) : null}

        <FormError message={result.error} />
        <Button type="submit" block loading={pending}>
          {coupon ? 'Guardar cambios' : 'Crear cupón'}
        </Button>
      </form>

      {coupon ? (
        <form
          action={async (fd) => {
            const r = await deleteCouponAction(fd);
            if (r?.error) setResult(r);
          }}
          onSubmit={(e) => {
            if (
              !confirm(
                '¿Eliminar este cupón? Esta acción no se puede deshacer.',
              )
            )
              e.preventDefault();
          }}
        >
          <input type="hidden" name="couponId" value={coupon.id} />
          <Button type="submit" variant="ghost" block className="text-danger">
            Eliminar cupón
          </Button>
        </form>
      ) : null}
    </div>
  );
}
