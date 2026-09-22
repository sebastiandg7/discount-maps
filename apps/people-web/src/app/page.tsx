import { CONTACT_LINKS } from '@org/domain';
import { BrandMark, buttonClassName, InstallHint } from '@org/ui';

/** Splash / role landing for signed-out visitors (signed-in users are sent to /mapas by proxy.ts). */
export default function Index() {
  const businessApp =
    process.env.NEXT_PUBLIC_BUSINESS_APP_URL ?? 'http://localhost:3001';
  const instagram = CONTACT_LINKS.find((l) => l.id === 'instagram');

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center gap-8 px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))]">
      <div className="flex flex-col items-center gap-3 text-center">
        <BrandMark className="size-24 text-brand-500" />
        <h1 className="text-4xl font-bold text-brand-600">Discount Maps</h1>
        <p className="text-lg text-ink-muted">
          Descuentos exclusivos en los negocios cerca de ti.
        </p>
      </div>

      <nav aria-label="Elige tu perfil" className="flex w-full flex-col gap-3">
        <a href="/login" className={buttonClassName('primary', 'py-4 text-lg')}>
          Soy persona
        </a>
        <a
          href={businessApp}
          className={buttonClassName('secondary', 'py-4 text-lg')}
        >
          Soy empresa
        </a>
        <p className="text-center text-sm text-ink-muted">
          ¿Nuevo aquí?{' '}
          <a href="/registro" className="font-semibold text-brand-600">
            Crea tu cuenta
          </a>{' '}
          y prueba una semana gratis.
        </p>
      </nav>

      <InstallHint className="w-full" />

      {instagram ? (
        <a
          href={instagram.href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-ink-muted"
        >
          Síguenos en Instagram · {instagram.description}
        </a>
      ) : null}
    </main>
  );
}
