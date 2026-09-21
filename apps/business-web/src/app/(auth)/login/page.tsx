import Link from 'next/link';
import { BackIcon, Brand, LoginForm, PageShell, TopBar } from '@org/ui';
import { loginAction } from '../../auth/actions';

const MESSAGES: Record<string, string> = {
  confirma:
    'Te enviamos un correo para confirmar la cuenta. Ábrelo para continuar.',
};
const ERRORS: Record<string, string> = {
  auth: 'No pudimos iniciar la sesión. Intenta de nuevo.',
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ mensaje?: string; error?: string; next?: string }>;
}) {
  const params = await searchParams;
  const message = params.mensaje ? MESSAGES[params.mensaje] : undefined;
  const error = params.error ? ERRORS[params.error] : undefined;

  return (
    <PageShell>
      <TopBar
        left={
          <Link href="/" aria-label="Volver" className="text-ink">
            <BackIcon />
          </Link>
        }
      />
      <Brand subtitle="Portal para empresas" />
      {message ? (
        <p
          role="status"
          className="mb-4 rounded-card bg-brand-50 px-4 py-3 text-sm text-brand-700"
        >
          {message}
        </p>
      ) : null}
      {error ? (
        <p
          role="alert"
          className="mb-4 rounded-card bg-danger/10 px-4 py-3 text-sm text-danger"
        >
          {error}
        </p>
      ) : null}
      <LoginForm
        action={loginAction}
        registerHref="/registro"
        next={params.next}
      />
    </PageShell>
  );
}
