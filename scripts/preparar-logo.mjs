// Quita el fondo blanco del logo, lo recorta y genera versiones para la web.
// Uso: node scripts/preparar-logo.mjs <ruta-del-logo-original>
import sharp from 'sharp';
import path from 'node:path';

const entrada = process.argv[2];
const out = path.resolve(import.meta.dirname, '..', 'public');
const { data, info } = await sharp(entrada).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const W = info.width, H = info.height, N = W * H;

const claro = (p) => {
  const i = p * 4, r = data[i], g = data[i + 1], b = data[i + 2];
  const mn = Math.min(r, g, b), mx = Math.max(r, g, b);
  return mn > 200 && mx - mn < 28;
};

// 1) Relleno desde los bordes: todo el fondo claro conectado al borde es transparente
const fondo = new Uint8Array(N);
const cola = new Int32Array(N);
let ini = 0, fin = 0;
const sembrar = (p) => { if (!fondo[p] && claro(p)) { fondo[p] = 1; cola[fin++] = p; } };
for (let x = 0; x < W; x++) { sembrar(x); sembrar((H - 1) * W + x); }
for (let y = 0; y < H; y++) { sembrar(y * W); sembrar(y * W + W - 1); }
while (ini < fin) {
  const p = cola[ini++], x = p % W, y = (p / W) | 0;
  if (x > 0) sembrar(p - 1);
  if (x < W - 1) sembrar(p + 1);
  if (y > 0) sembrar(p - W);
  if (y < H - 1) sembrar(p + W);
}

// 2) Quitar islas pequeñas (motas de compresión) que quedaron sueltas en el fondo
const visto = new Uint8Array(N);
for (let s = 0; s < N; s++) {
  if (fondo[s] || visto[s]) continue;
  ini = 0; fin = 0; cola[fin++] = s; visto[s] = 1;
  while (ini < fin) {
    const p = cola[ini++], x = p % W, y = (p / W) | 0;
    for (const q of [x > 0 ? p - 1 : -1, x < W - 1 ? p + 1 : -1, y > 0 ? p - W : -1, y < H - 1 ? p + W : -1]) {
      if (q >= 0 && !fondo[q] && !visto[q]) { visto[q] = 1; cola[fin++] = q; }
    }
  }
  if (fin < 1500) for (let k = 0; k < fin; k++) fondo[cola[k]] = 1;
}

// 3) Aplicar transparencia con un borde suave de 1px
for (let p = 0; p < N; p++) {
  if (fondo[p]) { data[p * 4 + 3] = 0; continue; }
  const x = p % W, y = (p / W) | 0;
  const vecinoFondo = (x > 0 && fondo[p - 1]) || (x < W - 1 && fondo[p + 1]) || (y > 0 && fondo[p - W]) || (y < H - 1 && fondo[p + W]);
  if (vecinoFondo) data[p * 4 + 3] = 170;
}

const buf = await sharp(data, { raw: info }).trim({ threshold: 1 }).png().toBuffer();
const meta = await sharp(buf).metadata();
console.log('recortado', meta.width, 'x', meta.height);
await sharp(buf).resize({ width: 640 }).webp({ quality: 90, alphaQuality: 95 }).toFile(path.join(out, 'logo.webp'));
await sharp(buf).resize({ width: 320 }).webp({ quality: 90, alphaQuality: 95 }).toFile(path.join(out, 'logo-320.webp'));
await sharp(buf).resize({ width: 640 }).png().toFile(path.join(out, 'logo.png'));

// Ícono: la paleta (parte superior del logo)
const icono = await sharp(buf)
  .extract({ left: Math.round(meta.width * 0.2), top: 0, width: Math.round(meta.width * 0.66), height: Math.round(meta.height * 0.43) })
  .png()
  .toBuffer();
await sharp(icono).resize(64, 64, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toFile(path.join(out, 'favicon.png'));
await sharp(icono).resize(180, 180, { fit: 'contain', background: { r: 251, g: 247, b: 236, alpha: 1 } }).png().toFile(path.join(out, 'apple-touch-icon.png'));
console.log('listo');
