import { ContactLinks, PageShell, TopBar } from '@org/ui';

export default function ContactPage() {
  return (
    <PageShell className="pb-20">
      <TopBar title="Contacto" />
      <p className="mb-4 text-ink-muted">
        ¿Tienes una duda, un problema con un cupón o quieres sumar tu negocio?
        Escríbenos por cualquiera de estos canales.
      </p>
      <ContactLinks />
    </PageShell>
  );
}
