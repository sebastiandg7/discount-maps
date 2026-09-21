import { notFound } from 'next/navigation';
import { categoryLabel, verificationStatusLabels } from '@org/domain';
import { publicStorageUrl } from '@org/supabase';
import { Brand, Button, EmptyState, PageShell } from '@org/ui';
import { signOutAction } from '../../auth/actions';
import { getSession } from '../../../lib/business';
import { verifyBusinessAction } from './actions';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const { supabase, role } = await getSession();
  if (role !== 'admin') notFound();

  const { data: businesses } = await supabase
    .from('businesses')
    .select(
      'id, display_name, legal_name, nit, category, logo_path, description, verification_status, created_at, branches_with_coords(name, address_line, city)',
    )
    .order('created_at', { ascending: true });

  const pending = (businesses ?? []).filter(
    (b) => b.verification_status === 'pending',
  );
  const decided = (businesses ?? []).filter(
    (b) => b.verification_status !== 'pending',
  );

  return (
    <PageShell>
      <Brand subtitle="Verificación de empresas" />

      <h2 className="mb-3 text-lg font-semibold text-ink">
        Pendientes ({pending.length})
      </h2>
      {pending.length === 0 ? (
        <EmptyState
          title="Nada pendiente"
          description="No hay empresas por verificar."
        />
      ) : (
        <ul className="flex flex-col gap-4">
          {pending.map((b) => (
            <li key={b.id} className="rounded-card border border-line p-4">
              <BusinessSummary business={b} />
              <div className="mt-4 flex gap-2">
                <form action={verifyBusinessAction} className="flex-1">
                  <input type="hidden" name="businessId" value={b.id} />
                  <input type="hidden" name="decision" value="verified" />
                  <Button type="submit" block>
                    Aprobar
                  </Button>
                </form>
                <form action={verifyBusinessAction} className="flex-1">
                  <input type="hidden" name="businessId" value={b.id} />
                  <input type="hidden" name="decision" value="rejected" />
                  <Button type="submit" variant="danger" block>
                    Rechazar
                  </Button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}

      {decided.length > 0 ? (
        <>
          <h2 className="mb-3 mt-8 text-lg font-semibold text-ink">
            Historial
          </h2>
          <ul className="flex flex-col gap-3">
            {decided.map((b) => (
              <li key={b.id} className="rounded-card border border-line p-4">
                <BusinessSummary business={b} />
              </li>
            ))}
          </ul>
        </>
      ) : null}

      <form action={signOutAction} className="mt-8">
        <Button type="submit" variant="ghost" block>
          Cerrar sesión
        </Button>
      </form>
    </PageShell>
  );
}

interface SummaryProps {
  business: {
    display_name: string;
    legal_name: string;
    nit: string;
    category: Parameters<typeof categoryLabel>[0];
    logo_path: string | null;
    description: string | null;
    verification_status: keyof typeof verificationStatusLabels;
    branches_with_coords: {
      name: string | null;
      address_line: string | null;
      city: string | null;
    }[];
  };
}

function BusinessSummary({ business: b }: SummaryProps) {
  const logo = publicStorageUrl('logos', b.logo_path);
  return (
    <div className="flex gap-3">
      {logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logo}
          alt=""
          className="size-14 shrink-0 rounded-full object-cover"
        />
      ) : (
        <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-surface-muted text-lg font-semibold text-ink-muted">
          {b.display_name.slice(0, 1)}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-ink">{b.display_name}</p>
        <p className="text-sm text-ink-muted">
          {b.legal_name} · NIT {b.nit} · {categoryLabel(b.category)}
        </p>
        <p className="text-sm text-ink-muted">
          {verificationStatusLabels[b.verification_status]}
        </p>
        {b.description ? (
          <p className="mt-1 text-sm text-ink">{b.description}</p>
        ) : null}
        <ul className="mt-2 text-sm text-ink-muted">
          {b.branches_with_coords.map((br, i) => (
            <li key={i}>
              {br.name}: {br.address_line}, {br.city}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
