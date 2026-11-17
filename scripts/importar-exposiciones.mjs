// Prepara las fotos (y portadas de video) de las exposiciones para la web.
//
// Uso: npm run exposiciones
//   Lee las carpetas de fotos indicadas abajo, crea public/exposiciones/<id>/*.webp
//   y genera src/data/exposiciones-fotos.json.
//   Los videos se comprimen aparte con ffmpeg (ver README) y quedan en
//   public/exposiciones/<id>/video.mp4; de ahí se saca la portada (poster.webp).

import sharp from 'sharp';
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = path.resolve(import.meta.dirname, '..');
const SALIDA = path.join(ROOT, 'public', 'exposiciones');
const DATOS = path.join(ROOT, 'src', 'data', 'exposiciones-fotos.json');

// id -> carpeta de fotos, foto de portada (por nombre o índice) y segundo del video para la portada
const EXPOS = {
  '1ra': { carpeta: 'E:/FOTOS 1RA EXPO', portada: 9, segundoPoster: 6 },
  '2da': { carpeta: 'E:/FOTOS 2DA EXPO', portada: 12, segundoPoster: 8 },
};

const resultado = {};
for (const [id, cfg] of Object.entries(EXPOS)) {
  const dir = path.join(SALIDA, id);
  await fs.mkdir(dir, { recursive: true });
  for (const f of await fs.readdir(dir)) if (/^foto-|^poster/.test(f)) await fs.rm(path.join(dir, f));

  let archivos = (await fs.readdir(cfg.carpeta)).filter((f) => /\.(jpe?g|png|webp)$/i.test(f)).sort();
  // la portada va primero
  const p = archivos.splice(cfg.portada, 1);
  archivos = [...p, ...archivos];

  const fotos = [];
  let n = 0;
  for (const a of archivos) {
    const nombre = `foto-${String(++n).padStart(2, '0')}`;
    const img = sharp(path.join(cfg.carpeta, a)).rotate();
    const meta = await img.metadata();
    const ancho = Math.min(meta.width, 1400);
    const alto = Math.round((meta.height * ancho) / meta.width);
    await img.clone().resize({ width: 1400, withoutEnlargement: true }).webp({ quality: 80 }).toFile(path.join(dir, `${nombre}.webp`));
    await img.clone().resize({ width: 600 }).webp({ quality: 74 }).toFile(path.join(dir, `${nombre}-mini.webp`));
    fotos.push({ imagen: `/exposiciones/${id}/${nombre}.webp`, miniatura: `/exposiciones/${id}/${nombre}-mini.webp`, ancho, alto, anchoMini: 600 });
  }

  // portada del video
  const video = path.join(dir, 'video.mp4');
  let poster = '';
  let videoInfo = null;
  if (existsSync(video)) {
    const tmp = path.join(dir, 'poster-tmp.png');
    execFileSync('ffmpeg', ['-y', '-v', 'error', '-ss', String(cfg.segundoPoster), '-i', video, '-frames:v', '1', tmp]);
    const m = await sharp(tmp).metadata();
    await sharp(tmp).webp({ quality: 80 }).toFile(path.join(dir, 'poster.webp'));
    await fs.rm(tmp);
    poster = `/exposiciones/${id}/poster.webp`;
    videoInfo = { src: `/exposiciones/${id}/video.mp4`, poster, ancho: m.width, alto: m.height };
  }

  resultado[id] = { video: videoInfo, fotos };
  console.log(`${id}: ${fotos.length} fotos${videoInfo ? ' + video' : ' (sin video aún)'}`);
}

await fs.writeFile(DATOS, JSON.stringify(resultado, null, 2) + '\n');
console.log('Listo: src/data/exposiciones-fotos.json');
