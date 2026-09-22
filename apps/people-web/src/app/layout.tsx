import type { Metadata } from 'next';
import './global.css';
import { RegisterServiceWorker } from './register-sw';

export const metadata: Metadata = {
  title: 'Discount Maps',
  description: 'Descuentos exclusivos en los negocios cerca de ti.',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'Discount Maps',
    statusBarStyle: 'default',
  },
  applicationName: 'Discount Maps',
  icons: {
    icon: [
      { url: '/icons/icon.svg', type: 'image/svg+xml' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: '/icons/apple-touch-icon-180.png',
  },
};

export const viewport = {
  themeColor: '#e11d48',
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
