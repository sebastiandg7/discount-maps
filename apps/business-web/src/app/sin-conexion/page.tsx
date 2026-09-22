import { BrandMark, ReloadButton } from '@org/ui';

/**
 * Offline fallback served by sw.js; public so it can be pre-cached at install.
 * Styled inline because the stylesheet is not cached while offline.
 */
export default function OfflinePage() {
  return (
    <main
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        padding: 24,
        textAlign: 'center',
        fontFamily: 'system-ui, sans-serif',
        color: '#1f2937',
        background: '#ffffff',
      }}
    >
      <div style={{ width: 64, height: 64, color: '#9ca3af' }}>
        <BrandMark className="" />
      </div>
      <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Sin conexión</h1>
      <p style={{ color: '#6b7280', maxWidth: 320, margin: 0 }}>
        No pudimos cargar esta pantalla. Revisa tu conexión a internet e intenta
        de nuevo.
      </p>
      <ReloadButton
        style={{
          background: '#e11d48',
          color: '#fff',
          border: 0,
          borderRadius: 12,
          padding: '12px 20px',
          fontSize: 16,
          fontWeight: 600,
        }}
      />
    </main>
  );
}
