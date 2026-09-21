'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import {
  couponSchema,
  fieldErrorMap,
  LOGO_MAX_BYTES,
  LOGO_MIME_TYPES,
  MIN_ACTIVE_COUPONS_ERROR,
} from '@org/domain';
import { getOwnBusiness, getSession } from '../../../../lib/business';

export interface CouponActionResult {
  error?: string;
  fieldErrors?: Record<string, string>;
}

const EXT: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
};

function text(formData: FormData, key: string): string {
  const v = formData.get(key);
  return typeof v === 'string' ? v : '';
}

function numberOrNull(formData: FormData, key: string): number | null {
  const v = text(formData, key).trim();
  if (v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Maps the Postgres trigger error to the merchant-facing message. */
function friendlyDbError(error: {
  message: string;
  hint?: string | null;
}): string {
  if (error.message.includes(MIN_ACTIVE_COUPONS_ERROR)) {
    return (
      error.hint ||
      'Debes mantener al menos 3 cupones activos. Activa otro antes de desactivar este.'
    );
  }
  return 'No pudimos guardar los cambios. Intenta de nuevo.';
}

/** Create or update a coupon. `couponId` empty → create. */
export async function saveCouponAction(
  formData: FormData,
): Promise<CouponActionResult> {
  const { supabase } = await getSession();
  const business = await getOwnBusiness();
  if (!business) return { error: 'No encontramos tu empresa.' };

  const couponId = text(formData, 'couponId');
  const parsed = couponSchema.safeParse({
    title: text(formData, 'title'),
    description: text(formData, 'description'),
    discountType: text(formData, 'discountType'),
    discountValue: numberOrNull(formData, 'discountValue'),
    terms: text(formData, 'terms'),
    validFrom: text(formData, 'validFrom'),
    validUntil: text(formData, 'validUntil'),
  });
  if (!parsed.success) {
    return { fieldErrors: fieldErrorMap(parsed.error) };
  }
  const isActive = text(formData, 'isActive') === 'true';

  const image = formData.get('image');
  const hasImage = image instanceof File && image.size > 0;
  if (hasImage) {
    if (!(LOGO_MIME_TYPES as readonly string[]).includes(image.type)) {
      return { fieldErrors: { image: 'La imagen debe ser PNG, JPG o WebP.' } };
    }
    if (image.size > LOGO_MAX_BYTES) {
      return { fieldErrors: { image: 'La imagen debe pesar máximo 2 MB.' } };
    }
  }

  const row = {
    business_id: business.id,
    title: parsed.data.title,
    description: parsed.data.description || null,
    discount_type: parsed.data.discountType,
    discount_value:
      parsed.data.discountType === 'percentage' ||
      parsed.data.discountType === 'fixed'
        ? parsed.data.discountValue
        : null,
    terms: parsed.data.terms || null,
    valid_from: parsed.data.validFrom || null,
    valid_until: parsed.data.validUntil || null,
    is_active: isActive,
  };

  let id = couponId;
  if (couponId) {
    const { error } = await supabase
      .from('coupons')
      .update(row)
      .eq('id', couponId)
      .eq('business_id', business.id);
    if (error) return { error: friendlyDbError(error) };
  } else {
    const { data, error } = await supabase
      .from('coupons')
      .insert(row)
      .select('id')
      .single();
    if (error || !data)
      return { error: friendlyDbError(error ?? { message: '' }) };
    id = data.id;
  }

  if (hasImage) {
    const path = `${business.id}/${id}.${EXT[image.type]}`;
    const { error: uploadError } = await supabase.storage
      .from('coupon-images')
      .upload(path, image, { upsert: true, contentType: image.type });
    if (!uploadError) {
      await supabase.from('coupons').update({ image_path: path }).eq('id', id);
    }
  }

  revalidatePath('/cupones');
  redirect('/cupones');
}

/** Flip is_active. Returns the trigger's Spanish hint when the minimum would be broken. */
export async function setCouponActiveAction(
  couponId: string,
  isActive: boolean,
): Promise<CouponActionResult> {
  const { supabase } = await getSession();
  const business = await getOwnBusiness();
  if (!business) return { error: 'No encontramos tu empresa.' };
  const { error } = await supabase
    .from('coupons')
    .update({ is_active: isActive })
    .eq('id', couponId)
    .eq('business_id', business.id);
  if (error) return { error: friendlyDbError(error) };
  revalidatePath('/cupones');
  return {};
}

export async function deleteCouponAction(
  formData: FormData,
): Promise<CouponActionResult> {
  const { supabase } = await getSession();
  const business = await getOwnBusiness();
  const couponId = text(formData, 'couponId');
  if (!business || !couponId) return { error: 'No encontramos el cupón.' };
  const { error } = await supabase
    .from('coupons')
    .delete()
    .eq('id', couponId)
    .eq('business_id', business.id);
  if (error) return { error: friendlyDbError(error) };
  revalidatePath('/cupones');
  redirect('/cupones');
}
