import Link from 'next/link';
import { redirect } from 'next/navigation';
import { formatCop } from '@org/domain';
import { BackIcon, EmptyState, PageShell, TopBar } from '@org/ui';
import { CardForm } from '../../../../components/card-form';
import {
  getCardCaptureData,
  getOwnSubscription,
  subscriptionPricePesos,
} from '../../../../lib/billing';
import { updateCardAction } from './actions';

export const dynamic = 'force-dynamic';

export default async function UpdateCardPage() {
  const subscription = await getOwnSubscription();
  if (!subscription) redirect('/suscripcion/tarjeta');
  const reactivating = subscription.status === 'canceled';
  const { tokens, tokenizationKey, apiUrl, publicKey } =
    await getCardCaptureData();
  const price = formatCop(subscriptionPricePesos());

  return (
    <PageShell>
      <TopBar
        title={reactivating ? 'Reactivar suscripción' : 'Actualizar tarjeta'}
        left={
          <Link href="/cuenta" aria-label="Volver" className="text-ink">
            <BackIcon />
          </Link>
        }
      />
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
          action={updateCardAction}
          submitLabel={
            reactivating ? 'Reactivar suscripción' : 'Guardar tarjeta'
          }
          intro={
            <p className="rounded-card bg-brand-50 px-4 py-3 text-sm text-brand-700">
              {reactivating ? (
                <>
                  Registra una tarjeta para volver a usar tus cupones.
                  Cobraremos <strong>{price}</strong> al mes; si tu periodo
                  pagado aún no termina, el primer cobro será al final de ese
                  periodo.
                </>
              ) : (
                <>
                  Reemplazaremos la tarjeta actual. Los cobros de{' '}
                  <strong>{price}</strong> al mes seguirán en las mismas fechas
                  {subscription.status === 'past_due'
                    ? ', y reintentaremos el cobro pendiente de inmediato'
                    : ''}
                  .
                </>
              )}
            </p>
          }
        />
      ) : (
        <EmptyState
          title="La pasarela de pagos no responde"
          description="Intenta de nuevo en unos minutos."
        />
      )}
    </PageShell>
  );
}
