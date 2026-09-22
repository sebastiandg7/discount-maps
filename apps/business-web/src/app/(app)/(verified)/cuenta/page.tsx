import Link from 'next/link';
import { publicStorageUrl } from '@org/supabase';
import {
  BackIcon,
  Button,
  PageShell,
  PasswordForm,
  ProfileForm,
  TopBar,
} from '@org/ui';
import { getOwnBusiness, getSession } from '../../../../lib/business';
import { signOutAction } from '../../../auth/actions';
import {
  addBranchAction,
  changePasswordAction,
  updateBusinessAction,
  updateProfileAction,
} from './actions';
import { AddBranchForm, BranchList, type BranchRow } from './branches';
import { BusinessForm } from './business-form';

export const dynamic = 'force-dynamic';

export default async function AccountPage() {
  const business = (await getOwnBusiness())!;
  const { supabase, userId, email } = await getSession();
  const [{ data: profile }, { data: branchRows }] = await Promise.all([
    supabase
      .from('profiles')
      .select('full_name, phone')
      .eq('id', userId!)
      .maybeSingle(),
    supabase
      .from('branches')
      .select('id, name, address_line, city, phone')
      .eq('business_id', business.id)
      .order('created_at'),
  ]);
  const branches: BranchRow[] = (branchRows ?? []).map((b) => ({
    id: b.id,
    name: b.name,
    addressLine: b.address_line,
    city: b.city,
    phone: b.phone,
  }));

  return (
    <PageShell className="gap-8">
      <TopBar
        title="Cuenta"
        left={
          <Link href="/inicio" aria-label="Volver" className="text-ink">
            <BackIcon />
          </Link>
        }
      />

      <section aria-label="Tu empresa" className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-ink">Tu empresa</h2>
        <BusinessForm
          action={updateBusinessAction}
          values={{
            displayName: business.display_name,
            legalName: business.legal_name,
            nit: business.nit,
            category: business.category,
            description: business.description ?? '',
          }}
          logoUrl={publicStorageUrl('logos', business.logo_path)}
        />
      </section>

      <section aria-label="Sedes" className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-ink">Sedes</h2>
        <BranchList branches={branches} />
        <details className="rounded-card border border-line p-4">
          <summary className="cursor-pointer font-semibold text-ink">
            Agregar sede
          </summary>
          <div className="mt-4">
            <AddBranchForm action={addBranchAction} count={branches.length} />
          </div>
        </details>
      </section>

      <section aria-label="Tu perfil" className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-ink">Tu perfil</h2>
        <ProfileForm
          action={updateProfileAction}
          values={{
            fullName: profile?.full_name ?? '',
            phone: profile?.phone ?? '',
            email: email ?? '',
          }}
        />
      </section>

      <details className="rounded-card border border-line p-4">
        <summary className="cursor-pointer font-semibold text-ink">
          Cambiar contraseña
        </summary>
        <div className="mt-4">
          <PasswordForm action={changePasswordAction} />
        </div>
      </details>

      <form action={signOutAction} className="mt-auto">
        <Button type="submit" variant="ghost" block>
          Cerrar sesión
        </Button>
      </form>
    </PageShell>
  );
}
