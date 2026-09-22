import Link from 'next/link';
import { BackIcon, PageShell, TopBar } from '@org/ui';
import { getOwnBusiness, getSession } from '../../../../lib/business';
import { Verifier, type VerifierBranch } from './verifier';

export const dynamic = 'force-dynamic';

export default async function VerifyPage() {
  const business = (await getOwnBusiness())!;
  const { supabase } = await getSession();
  const { data } = await supabase
    .from('branches')
    .select('id, name')
    .eq('business_id', business.id)
    .order('created_at');
  const branches: VerifierBranch[] = (data ?? []).map((b) => ({
    id: b.id,
    name: b.name,
  }));

  return (
    <PageShell>
      <TopBar
        title="Verificar cliente"
        left={
          <Link href="/inicio" aria-label="Volver" className="text-ink">
            <BackIcon />
          </Link>
        }
      />
      <p className="mb-4 text-sm text-ink-muted">
        Escanea el código QR que el cliente muestra en su teléfono.
      </p>
      <Verifier branches={branches} />
    </PageShell>
  );
}
