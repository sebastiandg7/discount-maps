// Generates the PWA icons of both apps from an inline SVG mark (no text, so no
// font dependency). Run from the repo root: `node scripts/generate-icons.mjs`.
// Replace the SVG with the real brand mark when the assets arrive (Phase 9 note).
import { mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';

const sharp = createRequire(import.meta.url)('sharp');

const BRAND = '#e11d48';
const BRAND_DARK = '#9f1239';
const INK = '#1f2937';

/** Map pin with a percent glyph, drawn in a 64×64 box (no fonts). */
function mark({ pin, glyph }) {
  return `
    <path d="M32 3C19.3 3 9 13.2 9 25.9c0 16.6 20.4 33.6 21.3 34.3a2.6 2.6 0 0 0 3.4 0C34.6 59.5 55 42.5 55 25.9 55 13.2 44.7 3 32 3z" fill="${pin}"/>
    <circle cx="25.5" cy="20" r="4" fill="none" stroke="${glyph}" stroke-width="2.6"/>
    <circle cx="38.5" cy="32" r="4" fill="none" stroke="${glyph}" stroke-width="2.6"/>
    <path d="M39.5 16.5 24.5 35.5" stroke="${glyph}" stroke-width="2.8" stroke-linecap="round"/>`;
}

/**
 * @param {object} o
 * @param {string} o.bg background colour (or 'none')
 * @param {number} o.radius corner radius as a fraction of the size (0 = square)
 * @param {number} o.scale mark size as a fraction of the box
 */
function svg({ bg, radius, scale, pin, glyph }) {
  const size = 512;
  const inner = size * scale;
  const offset = (size - inner) / 2;
  const rx = size * radius;
  const rect =
    bg === 'none'
      ? ''
      : `<rect width="${size}" height="${size}" rx="${rx}" fill="${bg}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}">
    ${rect}
    <g transform="translate(${offset} ${offset}) scale(${inner / 64})">${mark({ pin, glyph })}</g>
  </svg>`;
}

async function png(svgText, size, out) {
  await sharp(Buffer.from(svgText)).resize(size, size).png().toFile(out);
}

async function generate(dir, { bg, pin, glyph }) {
  await mkdir(dir, { recursive: true });
  const any = svg({ bg, radius: 0.22, scale: 0.78, pin, glyph });
  const maskable = svg({ bg, radius: 0, scale: 0.6, pin, glyph });
  const badge = svg({
    bg: 'none',
    radius: 0,
    scale: 1,
    pin: '#ffffff',
    glyph: bg,
  });
  await png(any, 192, path.join(dir, 'icon-192.png'));
  await png(any, 512, path.join(dir, 'icon-512.png'));
  await png(maskable, 512, path.join(dir, 'icon-maskable-512.png'));
  await png(maskable, 180, path.join(dir, 'apple-touch-icon-180.png'));
  await png(badge, 72, path.join(dir, 'badge-72.png'));
  await writeFile(path.join(dir, 'icon.svg'), any.trim());
}

const root = path.resolve(
  path.dirname(
    new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'),
  ),
  '..',
);
await generate(path.join(root, 'apps/people-web/public/icons'), {
  bg: BRAND,
  pin: '#ffffff',
  glyph: BRAND_DARK,
});
await generate(path.join(root, 'apps/business-web/public/icons'), {
  bg: INK,
  pin: '#ffffff',
  glyph: BRAND,
});
console.log('icons written for people-web and business-web');
