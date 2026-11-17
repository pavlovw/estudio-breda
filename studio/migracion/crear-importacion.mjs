// Crea migracion/salida/importar.ndjson con todo el contenido actual del sitio
// (obras, exposiciones y textos) para subirlo a Sanity UNA sola vez:
//
//   node migracion/crear-importacion.mjs
//   npx sanity dataset import migracion/salida/importar.ndjson production --replace
//
// Las imágenes se suben solas: Sanity lee las rutas "image@file://...".

import fs from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const SITIO = path.resolve(import.meta.dirname, '..', '..')
const SALIDA = path.join(import.meta.dirname, 'salida')
const FOTOS_IG = path.join(SITIO, 'herramientas', 'instagram', 'descargas', 'estudiobreda_arte', 'publicaciones')
const EXPOS = { '1ra': 'E:/FOTOS 1RA EXPO', '2da': 'E:/FOTOS 2DA EXPO' }
const PORTADA_EXPO = { '1ra': 9, '2da': 12 }

const leer = async (p) => JSON.parse(await fs.readFile(p, 'utf8'))
const imagen = (archivo) => ({ _type: 'image', _sanityAsset: `image@${pathToFileURL(archivo).href}` })
let k = 0
const clave = () => `k${(++k).toString(36)}`

await fs.rm(SALIDA, { recursive: true, force: true })
await fs.mkdir(SALIDA, { recursive: true })

const seleccion = await leer(path.join(SITIO, 'herramientas', 'instagram', 'seleccion.json'))
const obrasActuales = await leer(path.join(SITIO, 'src', 'data', 'obras.json'))
const sitio = await leer(path.join(SITIO, 'src', 'data', 'sitio.json'))
const docs = []

// ---------- Obras ----------
seleccion.forEach((s, i) => {
  const o = obrasActuales[i]
  const [anio, mes] = o.fecha.split('-').map(Number)
  docs.push({
    _id: `obra-${String(i + 1).padStart(3, '0')}`,
    _type: 'obra',
    foto: imagen(path.join(FOTOS_IG, s.archivo)),
    tecnica: s.tecnica,
    mes,
    anio,
    destacada: Boolean(s.destacada),
    ...(o.instagram ? { instagram: o.instagram } : {}),
    // orden original (las más nuevas al final se suben primero en la galería)
    _createdAt: new Date(Date.UTC(anio, mes - 1, 1) + (seleccion.length - i) * 1000).toISOString(),
  })
})

// ---------- Exposiciones ----------
// Las fotos con espacios en la ruta se copian a una carpeta temporal sin espacios
for (const e of sitio.exposiciones.lista) {
  const origen = EXPOS[e.id]
  const destino = path.join(SALIDA, `expo-${e.id}`)
  await fs.mkdir(destino, { recursive: true })
  let archivos = (await fs.readdir(origen)).filter((f) => /\.(jpe?g|png|webp)$/i.test(f)).sort()
  archivos = [...archivos.splice(PORTADA_EXPO[e.id], 1), ...archivos]
  const fotos = []
  for (const [n, a] of archivos.entries()) {
    const copia = path.join(destino, `foto-${String(n + 1).padStart(2, '0')}${path.extname(a)}`)
    await fs.copyFile(path.join(origen, a), copia)
    fotos.push({ ...imagen(copia), _key: clave() })
  }
  docs.push({
    _id: `exposicion-${e.id}`,
    _type: 'exposicion',
    nombre: e.nombre,
    numero: e.numero,
    fecha: e.fecha,
    descripcion: e.descripcion,
    videoRuta: `/exposiciones/${e.id}/video.mp4`,
    portadaVideo: imagen(path.join(SITIO, 'public', 'exposiciones', e.id, 'poster.webp')),
    fotos,
  })
}

// ---------- Textos del sitio ----------
const conClaves = (arr) => arr.map((x) => ({ ...x, _key: clave() }))
const { lista: _lista, ...textosExpo } = sitio.exposiciones
docs.push({
  _id: 'sitio',
  _type: 'sitio',
  nombre: sitio.nombre,
  nombreCompleto: sitio.nombreCompleto,
  whatsapp: sitio.whatsapp,
  instagram: sitio.instagram,
  instagramUsuario: sitio.instagramUsuario,
  hero: sitio.hero,
  quienesSomos: { ...sitio.quienesSomos, cifras: conClaves(sitio.quienesSomos.cifras) },
  tecnicas: { ...sitio.tecnicas, lista: conClaves(sitio.tecnicas.lista) },
  clases: { ...sitio.clases, niveles: conClaves(sitio.clases.niveles) },
  galeria: sitio.galeria,
  exposiciones: textosExpo,
  contacto: sitio.contacto,
})

await fs.writeFile(path.join(SALIDA, 'importar.ndjson'), docs.map((d) => JSON.stringify(d)).join('\n') + '\n')
console.log(`Listo: ${docs.length} documentos en migracion/salida/importar.ndjson`)
