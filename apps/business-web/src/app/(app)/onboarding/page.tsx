import { redirect } from 'next/navigation';
import { Brand, Button, PageShell } from '@org/ui';
import { signOutAction } from '../../auth/actions';
import { getOwnBusiness, getSession } from '../../../lib/business';
import { createBusinessAction } from './actions';
import { OnboardingForm } from './onboarding-form';

export default async function OnboardingPage() {
  const { role } = await getSession();
  if (role === 'admin') redirect('/admin');
  if (await getOwnBusiness()) redirect('/pendiente');

  return (
    <PageShell>
      <Brand subtitle="Cuéntanos sobre tu empresa y sus sedes." />
      <OnboardingForm action={createBusinessAction} />
      <form action={signOutAction} className="mt-8">
        <Button type="submit" variant="ghost" block>
          Cerrar sesión
        </Button>
      </form>
    </PageShell>
  );
}
