import type { MetadataRoute } from 'next';

/** Minimal installable manifest; icons and splash polish land in Phase 9. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Discount Maps',
    short_name: 'Discount Maps',
    description: 'Descuentos exclusivos en los negocios cerca de ti.',
    lang: 'es-CO',
    start_url: '/mapas',
    scope: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#e11d48',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
