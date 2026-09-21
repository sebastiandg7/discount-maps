import { redirect } from 'next/navigation';
import { getOwnBusiness, getSession } from '../../../lib/business';

/**
 * Everything under this segment needs a VERIFIED business. Admins are sent to /admin,
 * merchants without a business to /onboarding, unverified ones to /pendiente.
 */
export default async function VerifiedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { role } = await getSession();
  if (role === 'admin') redirect('/admin');
  const business = await getOwnBusiness();
  if (!business) redirect('/onboarding');
  if (business.verification_status !== 'verified') redirect('/pendiente');
  return children;
}
