import { z } from 'zod';
import { CATEGORY_IDS } from './categories';

const email = z.email('Ingresa un correo válido.');
const password = z
  .string()
  .min(8, 'La contraseña debe tener al menos 8 caracteres.')
  .max(72, 'La contraseña es demasiado larga.');
const fullName = z
  .string()
  .trim()
  .min(2, 'Ingresa tu nombre.')
  .max(80, 'El nombre es demasiado largo.');
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Máximo ${max} caracteres.`)
    .optional()
    .or(z.literal(''));

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Ingresa tu contraseña.'),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const consumerSignupSchema = z.object({ fullName, email, password });
export type ConsumerSignupInput = z.infer<typeof consumerSignupSchema>;

export const businessSignupSchema = z.object({
  fullName,
  email,
  password,
  legalName: z.string().trim().min(2, 'Ingresa la razón social.').max(120),
  displayName: z.string().trim().min(2, 'Ingresa el nombre comercial.').max(60),
  nit: z
    .string()
    .trim()
    .regex(/^\d{6,10}(-\d)?$/, 'Ingresa un NIT válido (ej. 900123456-7).'),
  category: z.enum(CATEGORY_IDS, 'Selecciona una categoría.'),
  description: optionalText(500),
  phone: optionalText(20),
});
export type BusinessSignupInput = z.infer<typeof businessSignupSchema>;

/** Company data collected at onboarding (no auth fields). */
export const businessProfileSchema = z.object({
  legalName: z.string().trim().min(2, 'Ingresa la razón social.').max(120),
  displayName: z.string().trim().min(2, 'Ingresa el nombre comercial.').max(60),
  nit: z
    .string()
    .trim()
    .regex(/^\d{6,10}(-\d)?$/, 'Ingresa un NIT válido (ej. 900123456-7).'),
  category: z.enum(CATEGORY_IDS, 'Selecciona una categoría.'),
  description: optionalText(500),
  phone: optionalText(20),
});
export type BusinessProfileInput = z.infer<typeof businessProfileSchema>;

export const branchSchema = z.object({
  name: z.string().trim().min(2, 'Ingresa el nombre de la sede.').max(60),
  addressLine: z.string().trim().min(5, 'Ingresa la dirección.').max(160),
  city: z.string().trim().min(2, 'Ingresa la ciudad.').max(60),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  googlePlaceId: optionalText(200),
  phone: optionalText(20),
});
export type BranchInput = z.infer<typeof branchSchema>;

export const DISCOUNT_TYPES = ['percentage', 'fixed', 'bogo', 'other'] as const;

/** Accepts a full timestamp (with offset) or a plain YYYY-MM-DD from <input type="date">. */
const isoDate = z.iso
  .datetime({ offset: true })
  .or(z.iso.date())
  .or(z.literal(''));

export const couponSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(3, 'El título debe tener al menos 3 caracteres.')
      .max(60, 'El título debe tener máximo 60 caracteres.'),
    description: optionalText(500),
    discountType: z.enum(DISCOUNT_TYPES, 'Selecciona el tipo de descuento.'),
    discountValue: z.number().nonnegative().optional().nullable(),
    terms: optionalText(1000),
    imagePath: optionalText(300),
    validFrom: isoDate.optional(),
    validUntil: isoDate.optional(),
  })
  .superRefine((c, ctx) => {
    if (c.discountType === 'percentage') {
      if (
        c.discountValue == null ||
        c.discountValue < 1 ||
        c.discountValue > 100
      ) {
        ctx.addIssue({
          code: 'custom',
          path: ['discountValue'],
          message: 'El porcentaje debe estar entre 1 y 100.',
        });
      }
    }
    if (c.discountType === 'fixed') {
      if (c.discountValue == null || c.discountValue <= 0) {
        ctx.addIssue({
          code: 'custom',
          path: ['discountValue'],
          message: 'Ingresa el monto del descuento.',
        });
      }
    }
    if (c.validFrom && c.validUntil && c.validFrom > c.validUntil) {
      ctx.addIssue({
        code: 'custom',
        path: ['validUntil'],
        message: 'La fecha de fin debe ser posterior a la de inicio.',
      });
    }
  });
export type CouponInput = z.infer<typeof couponSchema>;

export const profileUpdateSchema = z.object({
  fullName,
  phone: optionalText(20),
});
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;

/** First message per field, for showing zod errors next to form inputs. */
export function fieldErrorMap(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.map(String).join('.') || '_form';
    if (!(key in out)) out[key] = issue.message;
  }
  return out;
}

export const MAX_BRANCHES = 20;

export const onboardingSchema = businessProfileSchema.extend({
  branches: z
    .array(branchSchema)
    .min(1, 'Agrega al menos una sede.')
    .max(MAX_BRANCHES, `Máximo ${MAX_BRANCHES} sedes.`),
});
export type OnboardingInput = z.infer<typeof onboardingSchema>;

export const LOGO_MAX_BYTES = 2 * 1024 * 1024;
export const LOGO_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
] as const;
