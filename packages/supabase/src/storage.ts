/** Public URL for an object in a public bucket (logos, coupon-images). */
export function publicStorageUrl(
  bucket: 'logos' | 'coupon-images',
  path: string | null | undefined,
): string | null {
  if (!path) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;
  return `${base}/storage/v1/object/public/${bucket}/${path}`;
}
