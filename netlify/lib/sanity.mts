// Cliente de Sanity con permiso de escritura. El token vive SOLO en las
// variables de entorno de Netlify (SANITY_WRITE_TOKEN), nunca en el código.
import { createClient } from '@sanity/client'
import { ErrorVisible } from './http.mts'

export function clienteEscritura() {
  const token = process.env.SANITY_WRITE_TOKEN
  if (!token) throw new ErrorVisible('Falta configurar SANITY_WRITE_TOKEN en Netlify', 500)
  return createClient({
    projectId: process.env.SANITY_PROJECT_ID || '4jx0qts1',
    dataset: process.env.SANITY_DATASET || 'production',
    apiVersion: '2025-01-01',
    token,
    useCdn: false,
    perspective: 'published',
  })
}

export const TECNICAS = ['grafito', 'lapices-colores', 'cera-oleo', 'cera-pastel', 'acuarela', 'acrilico', 'oleo']
export const NIVELES = ['ninos', 'jovenes', 'adultos']

const TIPOS_IMAGEN = ['image/jpeg', 'image/png', 'image/webp']
export const MAX_FOTO_MB = 5.5 // las funciones de Netlify aceptan hasta ~6 MB por petición

/** Sube una foto (File de un formulario) a Sanity y devuelve el objeto image listo para guardar. */
export async function subirFoto(archivo: FormDataEntryValue | null) {
  if (!(archivo instanceof File) || archivo.size === 0) throw new ErrorVisible('Falta la foto')
  if (!TIPOS_IMAGEN.includes(archivo.type)) throw new ErrorVisible('El archivo debe ser una foto (JPG, PNG o WEBP)')
  if (archivo.size > MAX_FOTO_MB * 1024 * 1024) throw new ErrorVisible('La foto es muy pesada (máximo 5 MB)')
  const buffer = Buffer.from(await archivo.arrayBuffer())
  const asset = await clienteEscritura().assets.upload('image', buffer, {
    filename: archivo.name || 'foto.jpg',
    contentType: archivo.type,
  })
  return { _type: 'image' as const, asset: { _type: 'reference' as const, _ref: asset._id } }
}

// ---------- Validación simple ----------
export function texto(v: unknown, max: number, campo: string): string {
  if (v === undefined || v === null) return ''
  if (typeof v !== 'string') throw new ErrorVisible(`"${campo}" debe ser texto`)
  const t = v.trim()
  if (t.length > max) throw new ErrorVisible(`"${campo}" es muy largo (máximo ${max} caracteres)`)
  return t
}
export function entero(v: unknown, min: number, max: number, campo: string): number {
  const n = typeof v === 'string' ? Number(v) : v
  if (typeof n !== 'number' || !Number.isInteger(n) || n < min || n > max) throw new ErrorVisible(`"${campo}" no es válido`)
  return n
}
export function deLista(v: unknown, lista: string[], campo: string): string {
  if (typeof v !== 'string' || !lista.includes(v)) throw new ErrorVisible(`"${campo}" no es válido`)
  return v
}
export const booleano = (v: unknown) => v === true || v === 'true' || v === 'on' || v === '1'
