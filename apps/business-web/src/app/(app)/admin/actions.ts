'use server';

import { revalidatePath } from 'next/cache';
import { getSession } from '../../../lib/business';

/** Approve or reject a pending business. Admin only; RLS + trigger enforce it again in the DB. */
export async function verifyBusinessAction(formData: FormData): Promise<void> {
  const { supabase, userId, role } = await getSession();
  if (!userId || role !== 'admin') return;
  const businessId = formData.get('businessId');
  const decision = formData.get('decision');
  if (
    typeof businessId !== 'string' ||
    (decision !== 'verified' && decision !== 'rejected')
  ) {
    return;
  }
  await supabase
    .from('businesses')
    .update({
      verification_status: decision,
      verified_at: decision === 'verified' ? new Date().toISOString() : null,
      verified_by: userId,
    })
    .eq('id', businessId);
  revalidatePath('/admin');
}
