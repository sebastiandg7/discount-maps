import Link from 'next/link';
import { BackIcon, Brand, PageShell, SignupForm, TopBar } from '@org/ui';
import { signupAction } from '../../auth/actions';

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
      <Brand subtitle="Crea la cuenta del responsable. Luego registrarás tu empresa y sus sedes." />
      <SignupForm
        action={signupAction}
        loginHref="/login"
        submitLabel="Continuar"
      />
    </PageShell>
  );
}
