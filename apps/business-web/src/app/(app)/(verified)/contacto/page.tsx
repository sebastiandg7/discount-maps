import Link from 'next/link';
import { BackIcon, ContactLinks, PageShell, TopBar } from '@org/ui';

export default function ContactPage() {
  return (
    <PageShell>
      <TopBar
        title="Contacto"
        left={
          <Link href="/inicio" aria-label="Volver" className="text-ink">
            <BackIcon />
          </Link>
        }
      />
      <p className="mb-4 text-ink-muted">
        ¿Necesitas ayuda con tus cupones, tus sedes o la verificación de tu
        empresa? Escríbenos por cualquiera de estos canales.
      </p>
      <ContactLinks />
    </PageShell>
  );
}
