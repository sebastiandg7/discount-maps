import type { MetadataRoute } from 'next';

/** Installable manifest for the merchant app (icons from scripts/generate-icons.mjs). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'Discount Maps Empresas',
    short_name: 'DM Empresas',
    description: 'Publica cupones y verifica clientes de Discount Maps.',
    lang: 'es-CO',
    start_url: '/inicio',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#ffffff',
    theme_color: '#1f2937',
    categories: ['business', 'productivity'],
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
        name: 'Verificar cliente',
        short_name: 'Verificar',
        url: '/verificar',
        icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }],
      },
      {
        name: 'Cupones',
        short_name: 'Cupones',
        url: '/cupones',
        icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }],
      },
    ],
  };
}
