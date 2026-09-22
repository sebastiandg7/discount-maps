import type { MetadataRoute } from 'next';

/** Installable manifest. Icons come from scripts/generate-icons.mjs (swap for the brand assets). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'Discount Maps',
    short_name: 'Discount Maps',
    description: 'Descuentos exclusivos en los negocios cerca de ti.',
    lang: 'es-CO',
    start_url: '/mapas',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#ffffff',
    theme_color: '#e11d48',
    categories: ['shopping', 'food', 'lifestyle'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      {
        src: '/icons/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      { src: '/icons/icon.svg', sizes: 'any', type: 'image/svg+xml' },
    ],
    shortcuts: [
      {
        name: 'Mapas',
        short_name: 'Mapas',
        url: '/mapas',
        icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }],
      },
      {
        name: 'Mi cuenta',
        short_name: 'Cuenta',
        url: '/cuenta',
        icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }],
      },
    ],
  };
}
