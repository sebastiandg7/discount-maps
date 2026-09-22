import { Button, EmptyState, PageShell, TopBar } from '@org/ui';
import { signOutAction } from '../../../auth/actions';

export default function AccountPage() {
  return (
    <PageShell className="pb-20">
      <TopBar title="Cuenta" />
      <EmptyState
        title="Muy pronto"
        description="Tu perfil y tu suscripción aparecerán aquí."
      />
      <form action={signOutAction} className="mt-auto">
        <Button type="submit" variant="ghost" block>
          Cerrar sesión
        </Button>
      </form>
    </PageShell>
  );
}
