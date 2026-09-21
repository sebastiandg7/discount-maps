export default function Index() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4">
      <h1 className="text-3xl font-bold text-brand-600">Discount Maps</h1>
      <p className="text-center text-ink-muted">
        Descuentos exclusivos en los negocios cerca de ti.
      </p>
      <div className="flex w-full max-w-xs flex-col gap-3">
        <a
          href="/login"
          className="rounded-card bg-brand-500 px-6 py-3 text-center font-semibold text-white"
        >
          Persona
        </a>
        <a
          href={
            process.env.NEXT_PUBLIC_BUSINESS_APP_URL ?? 'http://localhost:3001'
          }
          className="rounded-card border border-brand-500 px-6 py-3 text-center font-semibold text-brand-600"
        >
          Empresa
        </a>
      </div>
    </main>
  );
}
