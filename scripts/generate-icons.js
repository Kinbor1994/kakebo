const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const iconsDir = path.join(__dirname, '..', 'public', 'icons');
const publicDir = path.join(__dirname, '..', 'public');

if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// 1. Standard SVG Icon (Full bleed / rounded rectangle)
const standardSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#047857" />
      <stop offset="100%" stop-color="#064E3B" />
    </linearGradient>
    <linearGradient id="circleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#10B981" stop-opacity="0.3" />
      <stop offset="100%" stop-color="#059669" stop-opacity="0.1" />
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="112" fill="url(#bgGrad)"/>
  <circle cx="256" cy="256" r="190" fill="url(#circleGrad)" stroke="#34D399" stroke-width="6" stroke-dasharray="8 8" opacity="0.6"/>
  <!-- Minimalist Japanese Kakeibo Kanji 家 (Home / Family budget) -->
  <text x="50%" y="54%" font-family="system-ui, -apple-system, sans-serif" font-size="220" font-weight="900" fill="#FFFFFF" text-anchor="middle" dominant-baseline="middle">家</text>
  <text x="50%" y="82%" font-family="system-ui, -apple-system, sans-serif" font-size="34" font-weight="700" fill="#A7F3D0" text-anchor="middle" letter-spacing="8">KAKEIBO</text>
</svg>
`;

// 2. Maskable SVG Icon (Safe zone margin: content stays within 80% diameter circle)
const maskableSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bgGradMask" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#047857" />
      <stop offset="100%" stop-color="#064E3B" />
    </linearGradient>
  </defs>
  <!-- Full bleed square for Android icon masking -->
  <rect width="512" height="512" fill="url(#bgGradMask)"/>
  <circle cx="256" cy="256" r="150" fill="#10B981" opacity="0.15" stroke="#34D399" stroke-width="4"/>
  <text x="50%" y="53%" font-family="system-ui, -apple-system, sans-serif" font-size="180" font-weight="900" fill="#FFFFFF" text-anchor="middle" dominant-baseline="middle">家</text>
  <text x="50%" y="78%" font-family="system-ui, -apple-system, sans-serif" font-size="28" font-weight="700" fill="#A7F3D0" text-anchor="middle" letter-spacing="6">KAKEIBO</text>
</svg>
`;

async function generateIcons() {
  console.log('Generating PWA icons...');

  // Save standard icon.svg
  fs.writeFileSync(path.join(publicDir, 'icon.svg'), standardSvg.trim());

  // 192x192 Standard
  await sharp(Buffer.from(standardSvg))
    .resize(192, 192)
    .png()
    .toFile(path.join(iconsDir, 'icon-192.png'));
  fs.copyFileSync(path.join(iconsDir, 'icon-192.png'), path.join(publicDir, 'icon-192.png'));

  // 512x512 Standard
  await sharp(Buffer.from(standardSvg))
    .resize(512, 512)
    .png()
    .toFile(path.join(iconsDir, 'icon-512.png'));
  fs.copyFileSync(path.join(iconsDir, 'icon-512.png'), path.join(publicDir, 'icon-512.png'));

  // 192x192 Maskable
  await sharp(Buffer.from(maskableSvg))
    .resize(192, 192)
    .png()
    .toFile(path.join(iconsDir, 'icon-192-maskable.png'));

  // 512x512 Maskable
  await sharp(Buffer.from(maskableSvg))
    .resize(512, 512)
    .png()
    .toFile(path.join(iconsDir, 'icon-512-maskable.png'));

  // Apple Touch Icon 180x180
  await sharp(Buffer.from(standardSvg))
    .resize(180, 180)
    .png()
    .toFile(path.join(iconsDir, 'apple-touch-icon.png'));
  fs.copyFileSync(path.join(iconsDir, 'apple-touch-icon.png'), path.join(publicDir, 'apple-touch-icon.png'));

  // Favicons
  await sharp(Buffer.from(standardSvg))
    .resize(32, 32)
    .png()
    .toFile(path.join(iconsDir, 'favicon-32x32.png'));

  await sharp(Buffer.from(standardSvg))
    .resize(16, 16)
    .png()
    .toFile(path.join(iconsDir, 'favicon-16x16.png'));

  console.log('All PWA PNG icons generated successfully!');
}

generateIcons().catch(console.error);
