import { redirect } from 'next/navigation';
import { categoryLabel } from '@org/domain';
import { publicStorageUrl } from '@org/supabase';
import { Brand, Button, PageShell } from '@org/ui';
import { signOutAction } from '../../auth/actions';
import { getOwnBusiness, getSession } from '../../../lib/business';

export default async function PendingPage() {
  const { role } = await getSession();
  if (role === 'admin') redirect('/admin');
  const business = await getOwnBusiness();
  if (!business) redirect('/onboarding');
  if (business.verification_status === 'verified') redirect('/inicio');

  const rejected = business.verification_status === 'rejected';
  const logo = publicStorageUrl('logos', business.logo_path);

  return (
    <PageShell className="justify-center">
      <Brand />
      <div className="flex flex-col items-center gap-4 rounded-card border border-line p-6 text-center">
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logo}
            alt=""
            className="size-20 rounded-full object-cover"
          />
        ) : null}
        <div>
          <p className="text-xl font-semibold text-ink">
            {business.display_name}
          </p>
          <p className="text-sm text-ink-muted">
            {categoryLabel(business.category)}
          </p>
        </div>
        {rejected ? (
          <>
            <span className="rounded-pill bg-danger/10 px-3 py-1 text-sm font-medium text-danger">
              Solicitud rechazada
            </span>
            <p className="text-ink-muted">
              No pudimos verificar tu empresa. Escríbenos por WhatsApp para
              revisar tu caso.
            </p>
          </>
        ) : (
          <>
            <span className="rounded-pill bg-brand-50 px-3 py-1 text-sm font-medium text-brand-700">
              En verificación
            </span>
            <p className="text-ink-muted">
              Estamos revisando tu empresa. Te avisaremos por correo cuando esté
              aprobada; después podrás crear tus cupones.
            </p>
          </>
        )}
      </div>
      <form action={signOutAction} className="mt-8">
        <Button type="submit" variant="ghost" block>
          Cerrar sesión
        </Button>
      </form>
    </PageShell>
  );
}
