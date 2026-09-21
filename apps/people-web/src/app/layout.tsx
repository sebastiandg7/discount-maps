import './global.css';

export const metadata = {
  title: 'Discount Maps',
  description: 'Descuentos exclusivos en los negocios cerca de ti.',
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
      <body>{children}</body>
    </html>
  );
}
