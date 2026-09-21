/**
 * Contact channels shown on the "Contacto" page of both apps.
 * TODO(owner): replace placeholders with the real handles before Phase 8.
 */
export const CONTACT_LINKS = [
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    href: 'https://wa.me/573000000000',
    description: 'Escríbenos por WhatsApp',
  },
  {
    id: 'instagram',
    label: 'Instagram',
    href: 'https://instagram.com/discountmaps',
    description: '@discountmaps',
  },
  {
    id: 'tiktok',
    label: 'TikTok',
    href: 'https://tiktok.com/@discountmaps',
    description: '@discountmaps',
  },
  {
    id: 'email',
    label: 'Correo',
    href: 'mailto:hola@discountmaps.co',
    description: 'hola@discountmaps.co',
  },
] as const;

export type ContactLink = (typeof CONTACT_LINKS)[number];
