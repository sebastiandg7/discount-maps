import Link from 'next/link';
import { BackIcon, Brand, PageShell, SignupForm, TopBar } from '@org/ui';
import { googleAction, signupAction } from '../../auth/actions';

export default function RegisterPage() {
  return (
    <PageShell>
      <TopBar
        left={
          <Link href="/" aria-label="Volver" className="text-ink">
            <BackIcon />
          </Link>
        }
      />
      <Brand subtitle="Crea tu cuenta. La primera semana es gratis." />
      <SignupForm
        action={signupAction}
        googleAction={googleAction}
        loginHref="/login"
      />
    </PageShell>
  );
}
