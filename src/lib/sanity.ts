// Lee todo el contenido publicado desde Sanity (al compilar el sitio).
import { createClient } from '@sanity/client'
import { createImageUrlBuilder } from '@sanity/image-url'

export const SANITY = {
  projectId: process.env.SANITY_PROJECT_ID || '4jx0qts1',
  dataset: process.env.SANITY_DATASET || 'production',
}

const cliente = createClient({ ...SANITY, apiVersion: '2025-01-01', useCdn: false, perspective: 'published' })
const constructor = createImageUrlBuilder(cliente)

type Dim = { width: number; height: number }
type ImagenSanity = {
  asset?: { _id: string; url: string; metadata?: { dimensions?: Dim; palette?: { dominant?: { background?: string } } } }
  crop?: { top: number; bottom: number; left: number; right: number }
  hotspot?: unknown
}

/** URL optimizada (webp/avif automático) y dimensiones reales tras el recorte. */
export function imagen(img: ImagenSanity, ancho: number) {
  const d = img.asset?.metadata?.dimensions ?? { width: ancho, height: ancho }
  const c = img.crop ?? { top: 0, bottom: 0, left: 0, right: 0 }
  const w = d.width * (1 - c.left - c.right)
  const h = d.height * (1 - c.top - c.bottom)
  const final = Math.round(Math.min(ancho, w))
  return {
    url: constructor.image(img as never).width(final).auto('format').quality(80).url(),
    ancho: final,
    alto: Math.round((h * final) / w),
  }
}

const CONSULTA = `{
  "sitio": *[_id == "sitio"][0]{
    ..., "heroObras": hero.obras[]._ref, "quienesObras": quienesSomos.obras[]._ref
  },
  "obras": *[_type == "obra" && defined(foto.asset)] | order(anio desc, mes desc, _createdAt desc){
    _id, titulo, alumno, edad, nivel, tecnica, mes, anio, destacada, instagram,
    foto{ crop, hotspot, asset->{ _id, url, metadata{ dimensions, palette{ dominant{ background } } } } }
  },
  "exposiciones": *[_type == "exposicion"] | order(fecha desc){
    _id, nombre, numero, fecha, descripcion, videoRuta,
    "videoUrl": video.asset->url,
    portadaVideo{ crop, hotspot, asset->{ _id, url, metadata{ dimensions } } },
    fotos[]{ _key, crop, hotspot, asset->{ _id, url, metadata{ dimensions } } }
  }
}`

export type RespuestaSanity = {
  sitio: Record<string, any> & { heroObras?: string[]; quienesObras?: string[] }
  obras: (Record<string, any> & { foto: ImagenSanity })[]
  exposiciones: (Record<string, any> & { portadaVideo?: ImagenSanity; fotos?: ImagenSanity[] })[]
}

export async function cargarDeSanity(): Promise<RespuestaSanity> {
  return cliente.fetch<RespuestaSanity>(CONSULTA)
}
