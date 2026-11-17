// Convierte las fotos elegidas de Instagram en imágenes para la galería
// y genera src/data/obras.json.
//
// Uso: npm run obras
//   Lee  herramientas/instagram/seleccion.json   (qué fotos son obras, técnica y destacadas)
//   Lee  herramientas/instagram/descargas/estudiobreda_arte/publicaciones/*.jpg
//   Crea public/obras/*.webp  y  src/data/obras.json
//
// Cuando el CMS esté listo, este paso lo reemplaza el panel de administración.

import sharp from 'sharp';
import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const ORIGEN = path.join(ROOT, 'herramientas', 'instagram', 'descargas', 'estudiobreda_arte', 'publicaciones');
const SELECCION = path.join(ROOT, 'herramientas', 'instagram', 'seleccion.json');
const SALIDA = path.join(ROOT, 'public', 'obras');
const DATOS = path.join(ROOT, 'src', 'data', 'obras.json');

const ANCHO_GRANDE = 1080;
const ANCHO_MINI = 560;

const seleccion = JSON.parse(await fs.readFile(SELECCION, 'utf8'));
await fs.rm(SALIDA, { recursive: true, force: true });
await fs.mkdir(SALIDA, { recursive: true });

const hex = ({ r, g, b }) => '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
const obras = [];
let n = 0;

for (const item of seleccion) {
  const archivo = path.join(ORIGEN, item.archivo);
  // 2024-07-29_19-06-00_C-BIkS3v4ca_8.jpg -> fecha 2024-07, código C-BIkS3v4ca
  const nombre = path.basename(item.archivo, '.jpg');
  const fecha = nombre.slice(0, 10);
  const codigo = nombre.slice(20).replace(/_\d+$/, '');
  const id = `${String(++n).padStart(3, '0')}-${item.tecnica}`;
  const img = sharp(archivo).rotate();
  const meta = await img.metadata();
  const ancho = Math.min(meta.width, ANCHO_GRANDE);
  const alto = Math.round((meta.height * ancho) / meta.width);
  const { dominant } = await sharp(archivo).stats();

  await img.clone().resize({ width: ANCHO_GRANDE, withoutEnlargement: true }).webp({ quality: 80 }).toFile(path.join(SALIDA, `${id}.webp`));
  await img.clone().resize({ width: ANCHO_MINI }).webp({ quality: 74 }).toFile(path.join(SALIDA, `${id}-mini.webp`));

  obras.push({
    id,
    titulo: '',
    alumno: '',
    edad: null,
    nivel: '',
    tecnica: item.tecnica,
    fecha: fecha.slice(0, 7),
    anio: Number(fecha.slice(0, 4)),
    destacada: Boolean(item.destacada),
    ancho,
    alto,
    anchoMini: ANCHO_MINI,
    color: hex(dominant),
    imagen: `/obras/${id}.webp`,
    miniatura: `/obras/${id}-mini.webp`,
    instagram: codigo ? `https://www.instagram.com/p/${codigo}/` : '',
  });
  if (n % 25 === 0) console.log(`  ${n}/${seleccion.length}`);
}

await fs.writeFile(DATOS, JSON.stringify(obras, null, 2) + '\n');
console.log(`Listo: ${obras.length} obras en public/obras y src/data/obras.json`);
