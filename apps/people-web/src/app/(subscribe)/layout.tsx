import { redirect } from 'next/navigation';
import { getOwnSubscription } from '../../lib/billing';
import { getSession } from '../../lib/session';

/** Card-capture step: needs a session, must not have a subscription yet. */
export default async function SubscribeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await getSession();
  if (!userId) redirect('/login?next=%2Fsuscripcion%2Ftarjeta');
  if (await getOwnSubscription()) redirect('/mapas');
  return children;
}
