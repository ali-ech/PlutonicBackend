/**
 * Downloads Justlife CDN photos + generates pest/bird illustrations locally.
 * Run from server/: npx tsx scripts/download-catalog-images.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const PUBLIC = path.join(ROOT, 'client/public/assets');
const JL = 'https://deax38zvkau9d.cloudfront.net/prod/assets/images/uploads/services';
const JL_STATIC = 'https://deax38zvkau9d.cloudfront.net/prod/assets/static/svgs';

type AssetDef = { file: string; url: string };

const DOWNLOADS: AssetDef[] = [
  // JustLife checkout chip icons (static CDN)
  { file: 'services/pest-general.svg', url: `${JL_STATIC}/pest-control.svg` },
  { file: 'services/disinfection.svg', url: `${JL_STATIC}/disinfection.svg` },
  { file: 'categories/furniture-cleaning.webp', url: `${JL}/1670930482furniture-cleaning.webp?f=webp&w=900` },
  { file: 'categories/home-cleaning.webp', url: `${JL}/1689846492house-cleaning-dubai.webp?f=webp&w=900` },
  { file: 'categories/pest-control.webp', url: `${JL}/1667551131pest-control-services.webp?f=webp&w=900` },
  // birds-control.webp — keep local generated asset in categories/ (not downloaded here)
  // categories/painting.webp, services/painting-color.webp, painting-white.webp, water-damage-repair.webp — local generated
  { file: 'services/sofa.webp', url: `${JL}/1720778159sofa-cleaning.webp?f=webp&w=700` },
  { file: 'services/carpet.webp', url: `${JL}/1552580155shutterstock_68494642.jpg?f=webp&w=700` },
  { file: 'services/mattress.webp', url: `${JL}/1552578988shutterstock_790083364.jpg?f=webp&w=700` },
  { file: 'services/curtain.webp', url: `${JL}/1552580284shutterstock_634425491.jpg?f=webp&w=700` },
  { file: 'services/deep-cleaning.webp', url: `${JL}/1552580501shutterstock_793058929.jpg?f=webp&w=700` },
  // Unsplash — downloaded locally (Justlife has no dedicated pages for these)
  { file: 'services/l-shaped-sofa.webp', url: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=700&q=90&auto=format&fit=crop' },
  { file: 'services/recliner.webp', url: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=700&q=90&auto=format&fit=crop' },
  { file: 'services/combos.webp', url: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=700&q=90&auto=format&fit=crop' },
  { file: 'services/bundles.webp', url: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=700&q=90&auto=format&fit=crop' },
  { file: 'services/outdoor.webp', url: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=700&q=90&auto=format&fit=crop' },
  { file: 'services/move-in-out.webp', url: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=700&q=90&auto=format&fit=crop' },
  { file: 'groups/apartment.webp', url: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=640&q=90&auto=format&fit=crop' },
  { file: 'groups/villa.webp', url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=640&q=90&auto=format&fit=crop' },
  { file: 'groups/kitchen.webp', url: 'https://images.unsplash.com/photo-1556911220-bff31c812dba?w=640&q=90&auto=format&fit=crop' },
  { file: 'groups/bathroom.webp', url: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=640&q=90&auto=format&fit=crop' },
];

/** JustLife flex checkout chip icon — compact blue glyph, no labels */
function chipIconSvg(inner: string, viewBox = '0 0 58 50') {
  return `<svg width="58" height="50" viewBox="${viewBox}" fill="none" xmlns="http://www.w3.org/2000/svg">${inner}</svg>`;
}

const PEST_CHIP_ICONS: { file: string; svg: string }[] = [
  {
    file: 'services/cockroaches.svg',
    svg: chipIconSvg(`
      <ellipse cx="29" cy="28" rx="16" ry="10" fill="#00C3FF"/>
      <circle cx="22" cy="24" r="2.5" fill="#00C3FF"/>
      <circle cx="36" cy="24" r="2.5" fill="#00C3FF"/>
      <path d="M18 28h-6M40 28h6M22 18l-4-6M36 18l4-6M24 36l-3 6M34 36l3 6" stroke="#00C3FF" stroke-width="2.2" stroke-linecap="round"/>
    `),
  },
  {
    file: 'services/mosquitoes.svg',
    svg: chipIconSvg(`
      <path d="M29 8v16" stroke="#00C3FF" stroke-width="2.2" stroke-linecap="round"/>
      <path d="M17 14c6-5 18-5 24 0M17 22c6 5 18 5 24 0" stroke="#00C3FF" stroke-width="2.2" stroke-linecap="round"/>
      <ellipse cx="29" cy="30" rx="5" ry="3.5" fill="#00C3FF"/>
      <path d="M24 33c-2 8 2 12 5 15 3-3 7-7 5-15" fill="#00C3FF"/>
    `),
  },
  {
    file: 'services/bed-bugs.svg',
    svg: chipIconSvg(`
      <rect x="12" y="24" width="34" height="12" rx="3" fill="#00C3FF"/>
      <path d="M12 30h34" stroke="#fff" stroke-width="1.5" opacity=".35"/>
      <ellipse cx="29" cy="18" rx="12" ry="6" fill="#00C3FF"/>
      <path d="M22 18h14" stroke="#fff" stroke-width="1.5" opacity=".35"/>
    `),
  },
  {
    file: 'services/ants.svg',
    svg: chipIconSvg(`
      <circle cx="29" cy="14" r="4" fill="#00C3FF"/>
      <ellipse cx="29" cy="24" rx="5" ry="6" fill="#00C3FF"/>
      <ellipse cx="29" cy="34" rx="4" ry="5" fill="#00C3FF"/>
      <path d="M22 22l-7 4M36 22l7 4M24 32l-6 5M34 32l6 5" stroke="#00C3FF" stroke-width="2.2" stroke-linecap="round"/>
    `),
  },
  {
    file: 'services/rodents.svg',
    svg: chipIconSvg(`
      <ellipse cx="24" cy="28" rx="14" ry="9" fill="#00C3FF"/>
      <circle cx="38" cy="22" r="8" fill="#00C3FF"/>
      <circle cx="41" cy="20" r="1.8" fill="#fff"/>
      <path d="M46 22c4-1 7 2 9 6" stroke="#00C3FF" stroke-width="2.2" stroke-linecap="round"/>
      <path d="M10 28c-5 2-8 7-9 12M20 36l-3 7M28 36l3 7" stroke="#00C3FF" stroke-width="2.2" stroke-linecap="round"/>
    `),
  },
  {
    file: 'services/apartment-disinfection.svg',
    svg: chipIconSvg(`
      <rect x="16" y="12" width="26" height="30" rx="2" fill="#00C3FF"/>
      <rect x="20" y="18" width="6" height="6" rx=".5" fill="#fff" opacity=".45"/>
      <rect x="32" y="18" width="6" height="6" rx=".5" fill="#fff" opacity=".45"/>
      <rect x="20" y="28" width="6" height="6" rx=".5" fill="#fff" opacity=".45"/>
      <rect x="32" y="28" width="6" height="6" rx=".5" fill="#fff" opacity=".45"/>
      <path d="M22 8h14v4H22z" fill="#00C3FF"/>
    `),
  },
  {
    file: 'services/villa-disinfection.svg',
    svg: chipIconSvg(`
      <path d="M29 10L10 24v18h38V24L29 10z" fill="#00C3FF"/>
      <rect x="24" y="28" width="10" height="14" rx="1" fill="#fff" opacity=".45"/>
      <rect x="16" y="26" width="7" height="7" rx=".5" fill="#fff" opacity=".35"/>
      <rect x="35" y="26" width="7" height="7" rx=".5" fill="#fff" opacity=".35"/>
    `),
  },
];

function illustrationSvg(title: string, subtitle: string, primary: string, secondary: string, icon: string) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="900" height="620" viewBox="0 0 900 620">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${primary}"/>
      <stop offset="100%" stop-color="${secondary}"/>
    </linearGradient>
  </defs>
  <rect width="900" height="620" fill="#f8fafc"/>
  <rect x="40" y="40" width="820" height="540" rx="40" fill="url(#bg)"/>
  <circle cx="760" cy="110" r="100" fill="#fff" opacity=".12"/>
  <circle cx="140" cy="500" r="120" fill="#fff" opacity=".1"/>
  <rect x="120" y="100" width="660" height="320" rx="32" fill="#fff" opacity=".92"/>
  <g transform="translate(450 260)" fill="none" stroke="${primary}" stroke-width="14" stroke-linecap="round" stroke-linejoin="round">
    ${icon}
  </g>
  <text x="450" y="470" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="40" font-weight="800" fill="#0f2742">${title}</text>
  <text x="450" y="510" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="20" font-weight="600" fill="#64748b">${subtitle}</text>
</svg>`;
}

const ILLUSTRATIONS: { file: string; svg: string }[] = [
  {
    file: 'categories/birds-control.svg',
    svg: illustrationSvg('Bird Control', 'Netting, spikes & humane deterrents', '#0284c7', '#67e8f9',
      '<path d="M-80 20c40-50 120-50 160 0 30-70 130-70 160 0 20-40 80-40 100 0"/><path d="M-120 60h240"/><circle cx="0" cy="-30" r="18" fill="' + '#0284c7' + '"/>'),
  },
  {
    file: 'services/bird-netting.svg',
    svg: illustrationSvg('Bird Netting', 'Balcony & façade protection', '#0284c7', '#7dd3fc',
      '<path d="M-90-20h180v140H-90z"/><path d="M-90-20l45 35 45-35 45 35 45-35"/><path d="M-90 20h180M-90 60h180M-90 100h180"/><path d="M-45-20v140M0-20v140M45-20v140"/>'),
  },
  {
    file: 'services/bird-spikes.svg',
    svg: illustrationSvg('Bird Spikes', 'Humane ledge deterrents', '#0369a1', '#a7f3d0',
      '<path d="M-100 40h200"/><path d="M-80 40V0M-40 40V-10M0 40V0M40 40V-10M80 40V0"/>'),
  },
  {
    file: 'services/bird-wire.svg',
    svg: illustrationSvg('Bird Wire', 'Low-profile protection', '#0f766e', '#7dd3fc',
      '<path d="M-100 30h200"/><path d="M-100 30c50-40 150-40 200 0"/><circle cx="-60" cy="10" r="6" fill="#0f766e"/><circle cx="60" cy="10" r="6" fill="#0f766e"/>'),
  },
  {
    file: 'services/bird-reflection.svg',
    svg: illustrationSvg('Bird Reflection', 'Visual deterrent panels', '#2563eb', '#bfdbfe',
      '<rect x="-70" y="-30" width="140" height="100" rx="8"/><path d="M-50 50l40-80 40 80z"/><circle cx="30" cy="-10" r="20"/>'),
  },
  {
    file: 'services/bird-trapping.svg',
    svg: illustrationSvg('Bird Trapping', 'Safe capture & removal', '#047857', '#bbf7d0',
      '<rect x="-60" y="-10" width="120" height="90" rx="12"/><path d="M-60 30h120"/><path d="M-30-10v-30M30-10v-30"/><path d="M-20 50c20 20 60 20 80 0"/>'),
  },
  {
    file: 'services/steel-mesh.svg',
    svg: illustrationSvg('Steel Mesh', 'Strong barrier install', '#475569', '#cbd5e1',
      '<rect x="-80" y="-20" width="160" height="120" rx="8"/><path d="M-80-20v120M-40-20v120M0-20v120M40-20v120M80-20v120"/><path d="M-80 20h160M-80 60h160M-80 100h160"/>'),
  },

];

async function downloadFile(relPath: string, url: string) {
  const dest = path.join(PUBLIC, relPath);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PlutonicAssetSync/1.0)' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(dest, buf);
  return `/assets/${relPath.replace(/\\/g, '/')}`;
}

async function main() {
  const manifest: Record<string, string> = {};

  for (const { file, url } of DOWNLOADS) {
    try {
      const publicPath = await downloadFile(file, url);
      const key = file.replace(/\.(webp|jpg|jpeg|png|svg)$/i, '').replace(/\//g, '-').replace(/^categories-/, 'category-').replace(/^services-/, '').replace(/^groups-/, 'group-');
      manifest[key] = publicPath;
      console.log('DL', file);
    } catch (e) {
      console.warn('FAIL', file, (e as Error).message);
    }
  }

  for (const { file, svg } of [...PEST_CHIP_ICONS, ...ILLUSTRATIONS]) {
    const dest = path.join(PUBLIC, file);
    if (fs.existsSync(dest) && DOWNLOADS.some((d) => d.file === file)) continue;
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, svg, 'utf8');
    const publicPath = `/assets/${file.replace(/\\/g, '/')}`;
    const key = file.replace(/\.(webp|jpg|jpeg|png|svg)$/i, '').replace(/\//g, '-').replace(/^categories-/, 'category-').replace(/^services-/, '').replace(/^groups-/, 'group-');
    manifest[key] = publicPath;
    console.log('SVG', file);
  }

  fs.writeFileSync(path.join(PUBLIC, 'image-manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(`\nDone — ${Object.keys(manifest).length} assets in client/public/assets/`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
