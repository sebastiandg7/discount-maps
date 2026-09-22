import { EmptyState, PageShell, TopBar } from '@org/ui';

export default function ContactPage() {
  return (
    <PageShell className="pb-20">
      <TopBar title="Contacto" />
      <EmptyState
        title="Muy pronto"
        description="Aquí encontrarás nuestros canales de contacto."
      />
    </PageShell>
  );
}
