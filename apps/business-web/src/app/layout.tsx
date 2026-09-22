import type { Metadata } from 'next';
import './global.css';
import { RegisterServiceWorker } from './register-sw';

export const metadata: Metadata = {
  title: 'Discount Maps — Empresas',
  description: 'Publica cupones y verifica clientes de Discount Maps.',
  applicationName: 'Discount Maps Empresas',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'DM Empresas',
    statusBarStyle: 'default',
  },
  icons: {
    icon: [
      { url: '/icons/icon.svg', type: 'image/svg+xml' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: '/icons/apple-touch-icon-180.png',
  },
};

export const viewport = {
  themeColor: '#1f2937',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es-CO">
      <body>
        {children}
        <RegisterServiceWorker />
      </body>
    </html>
  );
}
