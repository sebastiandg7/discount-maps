import './global.css';

export const metadata = {
  title: 'Discount Maps — Empresas',
  description: 'Publica cupones y verifica clientes de Discount Maps.',
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
