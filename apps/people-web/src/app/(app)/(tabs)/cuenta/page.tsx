import { subscriptionAccessUntil } from '@org/domain';
import { Button, PageShell, PasswordForm, ProfileForm, TopBar } from '@org/ui';
import {
  getOwnSubscription,
  subscriptionPricePesos,
} from '../../../../lib/billing';
import { getSession } from '../../../../lib/session';
import { signOutAction } from '../../../auth/actions';
import { changePasswordAction, updateProfileAction } from './actions';
import { SubscriptionCard } from './subscription-card';

export const dynamic = 'force-dynamic';

const NOTICES: Record<string, string> = {
  ok: 'Tarjeta actualizada.',
  reactivada: 'Suscripción reactivada. ¡Bienvenido de vuelta!',
  cobro: 'Tarjeta actualizada. Estamos procesando el cobro pendiente.',
};

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ tarjeta?: string }>;
}) {
  const { tarjeta } = await searchParams;
  const { supabase, userId, email, role } = await getSession();
  const [{ data: profile }, subscription] = await Promise.all([
    supabase
      .from('profiles')
      .select('full_name, phone')
      .eq('id', userId!)
      .maybeSingle(),
    getOwnSubscription(),
  ]);
  const { count: pendingPayments } = subscription
    ? await supabase
        .from('payments')
        .select('id', { count: 'exact', head: true })
        .eq('subscription_id', subscription.id)
        .eq('status', 'pending')
    : { count: 0 };

  return (
    <PageShell className="gap-8 pb-24">
      <TopBar title="Cuenta" />

      {subscription ? (
        <SubscriptionCard
          status={subscription.status}
          cardBrand={subscription.card_brand}
          cardLast4={subscription.card_last4}
          accessUntil={
            subscriptionAccessUntil(subscription)?.toISOString() ?? null
          }
          nextChargeAt={subscription.next_charge_at}
          trialEndsAt={subscription.trial_ends_at}
          pricePesos={subscriptionPricePesos()}
          pendingCharge={(pendingPayments ?? 0) > 0}
          notice={tarjeta ? NOTICES[tarjeta] : null}
        />
      ) : role === 'admin' ? (
        <p className="rounded-card bg-surface-muted px-4 py-3 text-sm text-ink-muted">
          Cuenta de administración: sin suscripción.
        </p>
      ) : null}

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

      <details className="group rounded-card border border-line p-4">
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
