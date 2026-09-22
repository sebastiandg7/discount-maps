import { formatCop } from '@org/domain';
import { Brand, Button, EmptyState, PageShell } from '@org/ui';
import { CardForm } from '../../../../components/card-form';
import {
  getCardCaptureData,
  subscriptionPricePesos,
} from '../../../../lib/billing';
import { signOutAction } from '../../../auth/actions';
import { startTrialAction } from './actions';

export const dynamic = 'force-dynamic';

export default async function CardPage() {
  const { tokens, tokenizationKey, apiUrl, publicKey } =
    await getCardCaptureData();

  return (
    <PageShell>
      <Brand subtitle="Registra tu tarjeta para empezar" />
      {tokens ? (
        <CardForm
          apiUrl={apiUrl}
          publicKey={publicKey}
          tokenizationKey={tokenizationKey}
          acceptance={{
            token: tokens.presigned_acceptance.acceptance_token,
            permalink: tokens.presigned_acceptance.permalink,
          }}
          personalData={{
            token: tokens.presigned_personal_data_auth.acceptance_token,
            permalink: tokens.presigned_personal_data_auth.permalink,
          }}
          action={startTrialAction}
          submitLabel="Empezar mi semana gratis"
          intro={
            <p className="rounded-card bg-brand-50 px-4 py-3 text-sm text-brand-700">
              Tu primera semana es gratis. Después cobraremos{' '}
              <strong>{formatCop(subscriptionPricePesos())}</strong> al mes a
              esta tarjeta. Puedes cancelar cuando quieras.
            </p>
          }
        />
      ) : (
        <EmptyState
          title="La pasarela de pagos no responde"
          description="Intenta de nuevo en unos minutos."
        />
      )}
      <form action={signOutAction} className="mt-8">
        <Button type="submit" variant="ghost" block>
          Cerrar sesión
        </Button>
      </form>
    </PageShell>
  );
}
