export default function Index() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4">
      <h1 className="text-3xl font-bold text-brand-600">Discount Maps</h1>
      <p className="text-center text-ink-muted">Portal para empresas.</p>
      <div className="flex w-full max-w-xs flex-col gap-3">
        <a
          href="/login"
          className="rounded-card bg-brand-500 px-6 py-3 text-center font-semibold text-white"
        >
          Iniciar sesión
        </a>
        <a
          href="/registro"
          className="rounded-card border border-brand-500 px-6 py-3 text-center font-semibold text-brand-600"
        >
          Crear cuenta
        </a>
      </div>
    </main>
  );
}
