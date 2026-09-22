import { Brand, Button, EmptyState, PageShell } from '@org/ui';
import { subscriptionPricePesos, wompiClient } from '../../../../lib/billing';
import { signOutAction } from '../../../auth/actions';
import { CardForm } from './card-form';

export const dynamic = 'force-dynamic';

export default async function CardPage() {
  const wompi = wompiClient();
  let tokens: Awaited<ReturnType<typeof wompi.getAcceptanceTokens>> | null =
    null;
  let tokenizationKey: string | null = null;
  try {
    tokens = await wompi.getAcceptanceTokens();
  } catch (error) {
    console.error('[billing] acceptance tokens failed', error);
  }
  try {
    tokenizationKey = await wompi.getTokenizationKey();
  } catch {
    tokenizationKey = null; // plain tokenization still works
  }

  return (
    <PageShell>
      <Brand subtitle="Registra tu tarjeta para empezar" />
      {tokens ? (
        <CardForm
          apiUrl={
            process.env.NEXT_PUBLIC_WOMPI_API_URL ??
            'https://sandbox.wompi.co/v1'
          }
          publicKey={process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY ?? ''}
          tokenizationKey={tokenizationKey}
          acceptance={{
            token: tokens.presigned_acceptance.acceptance_token,
            permalink: tokens.presigned_acceptance.permalink,
          }}
          personalData={{
            token: tokens.presigned_personal_data_auth.acceptance_token,
            permalink: tokens.presigned_personal_data_auth.permalink,
          }}
          pricePesos={subscriptionPricePesos()}
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
