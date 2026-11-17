// Contenido "en vivo" para el modo edición
//   GET /api/contenido  -> { sitio, obras, exposiciones } tal como están ahora en Sanity
// (El sitio público se compila con lo publicado; el panel necesita lo último, sin esperar.)
import type { Config } from '@netlify/functions'
import { error, json, protegido } from '../lib/http.mts'
import { clienteLectura } from '../lib/lectura.mts'

const MINI = '?w=320&h=320&fit=crop&auto=format&q=70'

const CONSULTA = `{
  "sitio": *[_id == "sitio"][0]{ ..., "heroObras": hero.obras[]._ref, "quienesObras": quienesSomos.obras[]._ref },
  "obras": *[_type == "obra"] | order(anio desc, mes desc, _createdAt desc){
    "id": _id, titulo, alumno, edad, nivel, tecnica, mes, anio, destacada,
    "miniatura": foto.asset->url + "${MINI}", "imagen": foto.asset->url + "?w=1080&auto=format"
  },
  "exposiciones": *[_type == "exposicion"] | order(fecha desc){
    "id": _id, nombre, numero, fecha, descripcion,
    "fotos": fotos[defined(asset)]{ "clave": _key, "miniatura": asset->url + "${MINI}" }
  }
}`

export default protegido(async (req) => {
  if (req.method !== 'GET') return error('Método no permitido', 405)
  return json({ ok: true, ...(await clienteLectura().fetch(CONSULTA)) })
})

export const config: Config = { path: '/api/contenido' }
