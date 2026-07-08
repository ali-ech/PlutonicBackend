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

type AssetDef = { file: string; url: string };

const DOWNLOADS: AssetDef[] = [
  { file: 'categories/furniture-cleaning.webp', url: `${JL}/1670930482furniture-cleaning.webp?f=webp&w=900` },
  { file: 'categories/home-cleaning.webp', url: `${JL}/1689846492house-cleaning-dubai.webp?f=webp&w=900` },
  { file: 'categories/pest-control.webp', url: `${JL}/1667551131pest-control-services.webp?f=webp&w=900` },
  { file: 'services/sofa.webp', url: `${JL}/1720778159sofa-cleaning.webp?f=webp&w=700` },
  { file: 'services/carpet.webp', url: `${JL}/1552580155shutterstock_68494642.jpg?f=webp&w=700` },
  { file: 'services/mattress.webp', url: `${JL}/1552578988shutterstock_790083364.jpg?f=webp&w=700` },
  { file: 'services/curtain.webp', url: `${JL}/1552580284shutterstock_634425491.jpg?f=webp&w=700` },
  { file: 'services/deep-cleaning.webp', url: `${JL}/1552580501shutterstock_793058929.jpg?f=webp&w=700` },
  // Unsplash — downloaded locally (Justlife has no dedicated pages for these)
  { file: 'services/l-shaped-sofa.webp', url: 'https://images.unsplash.com/photo-1493663284031-b7e3a525b3b8?w=700&q=90&auto=format&fit=crop' },
  { file: 'services/recliner.webp', url: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=700&q=90&auto=format&fit=crop' },
  { file: 'services/combos.webp', url: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=700&q=90&auto=format&fit=crop' },
  { file: 'services/bundles.webp', url: 'https://images.unsplash.com/photo-1615874957879-5a98b7c7cd8d?w=700&q=90&auto=format&fit=crop' },
  { file: 'services/outdoor.webp', url: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=700&q=90&auto=format&fit=crop' },
  { file: 'services/move-in-out.webp', url: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=700&q=90&auto=format&fit=crop' },
  { file: 'groups/apartment.webp', url: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=640&q=90&auto=format&fit=crop' },
  { file: 'groups/villa.webp', url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=640&q=90&auto=format&fit=crop' },
  { file: 'groups/kitchen.webp', url: 'https://images.unsplash.com/photo-1556911220-bff31c812dba?w=640&q=90&auto=format&fit=crop' },
  { file: 'groups/bathroom.webp', url: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=640&q=90&auto=format&fit=crop' },
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
  {
    file: 'services/pest-general.svg',
    svg: illustrationSvg('Pest Control', 'Licensed home treatment', '#0f766e', '#facc15',
      '<path d="M-30-20c-20 30-20 70 0 100 20-30 20-70 0-100z"/><path d="M-50 0h-30M50 0h30M-40 40h-20M40 40h20"/><circle cx="0" cy="30" r="12"/>'),
  },
  {
    file: 'services/cockroaches.svg',
    svg: illustrationSvg('Cockroach Control', 'Kitchen & bathroom treatment', '#92400e', '#fbbf24',
      '<ellipse cx="0" cy="20" rx="70" ry="40"/><path d="M-70 20h-25M70 20h25"/><path d="M-40 0l-20-25M40 0l20-25M-20 50l-15 25M20 50l15 25"/><circle cx="-15" cy="15" r="5" fill="#92400e"/><circle cx="15" cy="15" r="5" fill="#92400e"/>'),
  },
  {
    file: 'services/mosquitoes.svg',
    svg: illustrationSvg('Mosquito Control', 'Indoor & outdoor treatment', '#0e7490', '#67e8f9',
      '<path d="M0-50v70"/><path d="M-40-30c20-20 60-20 80 0M-40-10c20 20 60 20 80 0"/><ellipse cx="0" cy="30" rx="12" ry="8"/><path d="M-12 38c-8 20 8 35 12 50 4-15 20-30 12-50"/>'),
  },
  {
    file: 'services/bed-bugs.svg',
    svg: illustrationSvg('Bed Bug Treatment', 'Mattress & room service', '#7f1d1d', '#fca5a5',
      '<rect x="-80" y="10" width="160" height="50" rx="8"/><path d="M-80 35h160"/><ellipse cx="0" cy="-10" rx="50" ry="25"/><path d="M-30-10h60"/>'),
  },
  {
    file: 'services/ants.svg',
    svg: illustrationSvg('Ant Control', 'Colony treatment', '#854d0e', '#fde68a',
      '<circle cx="0" cy="-25" r="14"/><ellipse cx="0" cy="10" rx="18" ry="22"/><ellipse cx="0" cy="45" rx="14" ry="18"/><path d="M-18 5l-25 10M18 5l25 10M-12 40l-20 15M12 40l20 15"/>'),
  },
  {
    file: 'services/rodents.svg',
    svg: illustrationSvg('Rodent Control', 'Inspection & proofing', '#334155', '#94a3b8',
      '<ellipse cx="0" cy="15" rx="55" ry="35"/><circle cx="35" cy="-5" r="22"/><circle cx="45" cy="-12" r="4" fill="#334155"/><path d="M55-5c15-5 25 5 30 15"/><path d="M-55 15c-20 5-30 20-35 35"/><path d="M-10 45l-8 20M10 45l8 20"/>'),
  },
  {
    file: 'services/disinfection.svg',
    svg: illustrationSvg('Disinfection', 'Fogging & sanitizing', '#0891b2', '#a7f3d0',
      '<path d="M-20-40c0-20 40-20 40 0v20H-20z"/><rect x="-25" y="-20" width="50" height="70" rx="8"/><path d="M-50 10c-20 10-30 30-20 50 10-25 35-40 70-40s60 15 70 40c10-20 0-40-20-50"/>'),
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

  for (const { file, svg } of ILLUSTRATIONS) {
    const dest = path.join(PUBLIC, file);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, svg, 'utf8');
    const publicPath = `/assets/${file.replace(/\\/g, '/')}`;
    const key = file.replace(/\.svg$/i, '').replace(/\//g, '-').replace(/^categories-/, 'category-').replace(/^services-/, '');
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
