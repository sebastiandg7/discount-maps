'use server';

import { redirect } from 'next/navigation';
import {
  fieldErrorMap,
  LOGO_MAX_BYTES,
  LOGO_MIME_TYPES,
  onboardingSchema,
} from '@org/domain';
import type { AuthActionState } from '@org/ui';
import { getOwnBusiness, getSession } from '../../../lib/business';

const EXT: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
};

function text(formData: FormData, key: string): string {
  const v = formData.get(key);
  return typeof v === 'string' ? v : '';
}

function parseBranches(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function createBusinessAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const { supabase, userId, role } = await getSession();
  if (!userId || role !== 'business') {
    return {
      error: 'Solo las cuentas de empresa pueden registrar un negocio.',
    };
  }
  if (await getOwnBusiness()) {
    redirect('/pendiente');
  }

  const values = {
    legalName: text(formData, 'legalName'),
    displayName: text(formData, 'displayName'),
    nit: text(formData, 'nit'),
    category: text(formData, 'category'),
    description: text(formData, 'description'),
    phone: text(formData, 'phone'),
  };
  const parsed = onboardingSchema.safeParse({
    legalName: text(formData, 'legalName'),
    displayName: text(formData, 'displayName'),
    nit: text(formData, 'nit'),
    category: text(formData, 'category'),
    description: text(formData, 'description'),
    phone: text(formData, 'phone'),
    branches: parseBranches(text(formData, 'branches')),
  });
  if (!parsed.success) {
    const fieldErrors = fieldErrorMap(parsed.error);
    const branchError = Object.entries(fieldErrors).find(([k]) =>
      k.startsWith('branches'),
    );
    return {
      fieldErrors,
      values,
      error: branchError ? `Sedes: ${branchError[1]}` : undefined,
    };
  }

  const logo = formData.get('logo');
  const hasLogo = logo instanceof File && logo.size > 0;
  if (hasLogo) {
    if (!(LOGO_MIME_TYPES as readonly string[]).includes(logo.type)) {
      return {
        values,
        fieldErrors: { logo: 'El logo debe ser PNG, JPG o WebP.' },
      };
    }
    if (logo.size > LOGO_MAX_BYTES) {
      return {
        values,
        fieldErrors: { logo: 'El logo debe pesar máximo 2 MB.' },
      };
    }
  }

  const { data: business, error: insertError } = await supabase
    .from('businesses')
    .insert({
      owner_id: userId,
      legal_name: parsed.data.legalName,
      display_name: parsed.data.displayName,
      nit: parsed.data.nit,
      category: parsed.data.category,
      description: parsed.data.description || null,
    })
    .select('id')
    .single();
  if (insertError || !business) {
    return { error: 'No pudimos registrar la empresa. Intenta de nuevo.' };
  }

  for (const b of parsed.data.branches) {
    const { error } = await supabase.rpc('add_branch', {
      p_business_id: business.id,
      p_name: b.name,
      p_address_line: b.addressLine,
      p_city: b.city,
      p_lat: b.lat,
      p_lng: b.lng,
      p_google_place_id: b.googlePlaceId || undefined,
      p_phone: b.phone || undefined,
    });
    if (error) {
      return {
        error: `No pudimos guardar la sede "${b.name}". Revisa los datos.`,
      };
    }
  }

  if (hasLogo) {
    const path = `${business.id}/logo.${EXT[logo.type]}`;
    const { error: uploadError } = await supabase.storage
      .from('logos')
      .upload(path, logo, { upsert: true, contentType: logo.type });
    if (!uploadError) {
      await supabase
        .from('businesses')
        .update({ logo_path: path })
        .eq('id', business.id);
    }
  }

  if (parsed.data.phone) {
    await supabase
      .from('profiles')
      .update({ phone: parsed.data.phone })
      .eq('id', userId);
  }

  redirect('/pendiente');
}
