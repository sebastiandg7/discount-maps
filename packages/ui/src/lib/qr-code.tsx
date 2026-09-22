import { QRCodeSVG } from 'qrcode.react';

export interface QrCodeProps {
  value: string;
  /** Rendered size in CSS pixels (the SVG scales with its container). */
  size?: number;
  /** Accessible name of the graphic. */
  title?: string;
  className?: string;
}

/** The coupon QR the merchant scans. Error level M keeps it readable on phone screens. */
export function QrCode({
  value,
  size = 240,
  title = 'Código QR del cupón',
  className = '',
}: QrCodeProps) {
  return (
    <div
      className={`inline-block rounded-card bg-white p-3 shadow-sm ${className}`}
    >
      <QRCodeSVG
        value={value}
        size={size}
        level="M"
        marginSize={1}
        title={title}
        className="block h-auto w-full"
      />
    </div>
  );
}
