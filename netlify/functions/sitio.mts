// Textos del sitio
//   PATCH /api/sitio  { cambios: { "hero.titulo": "…", "clases.plan.precio": 27000, … } }
// Solo se aceptan los campos de esta lista, cada uno con su tipo.
import type { Config } from '@netlify/functions'
import { randomUUID } from 'node:crypto'
import { ErrorVisible, error, json, protegido } from '../lib/http.mts'
import { TECNICAS, clienteEscritura, entero, texto } from '../lib/sanity.mts'

type Validador = (v: unknown, campo: string) => unknown
const clave = () => randomUUID().slice(0, 12)

const linea: Validador = (v, c) => texto(v, 160, c)
const parrafo: Validador = (v, c) => texto(v, 1200, c)
const url: Validador = (v, c) => {
  const t = texto(v, 300, c)
  if (t && !/^https:\/\/[^\s]+$/.test(t)) throw new ErrorVisible(`"${c}" debe ser un enlace que empiece con https://`)
  return t
}
const listaTextos = (max: number, largo: number): Validador => (v, c) => {
  if (!Array.isArray(v) || v.length > max) throw new ErrorVisible(`"${c}" no es válido`)
  return v.map((x) => texto(x, largo, c)).filter(Boolean)
}
const listaObjetos = (max: number, campos: Record<string, Validador>, fijos?: { id: string[] }): Validador => (v, c) => {
  if (!Array.isArray(v) || v.length > max) throw new ErrorVisible(`"${c}" no es válido`)
  return v.map((x) => {
    if (typeof x !== 'object' || !x) throw new ErrorVisible(`"${c}" no es válido`)
    const o: Record<string, unknown> = { _key: typeof x._key === 'string' ? x._key.slice(0, 40) : clave() }
    for (const [k, val] of Object.entries(campos)) o[k] = val((x as Record<string, unknown>)[k], c)
    if (fijos && !fijos.id.includes(String(o.id))) throw new ErrorVisible(`"${c}" no es válido`)
    return o
  })
}
const refsObras = (max: number): Validador => (v, c) => {
  if (!Array.isArray(v) || v.length > max) throw new ErrorVisible(`"${c}": elige como máximo ${max} obras`)
  return v.map((id) => {
    if (typeof id !== 'string' || !/^obra-[A-Za-z0-9_-]{1,60}$/.test(id)) throw new ErrorVisible(`"${c}" no es válido`)
    return { _type: 'reference', _ref: id, _key: clave() }
  })
}
const precio: Validador = (v, c) => entero(v, 0, 10_000_000, c)
const idLinea: Validador = (v, c) => texto(v, 40, c)

const CAMPOS: Record<string, Validador> = {
  nombre: linea,
  nombreCompleto: linea,
  instagramUsuario: linea,
  whatsapp: url,
  instagram: url,
  ...Object.fromEntries(['antetitulo', 'titulo', 'palabraDestacada', 'botonPrincipal', 'botonSecundario'].map((k) => [`hero.${k}`, linea])),
  'hero.bajada': parrafo,
  'hero.obras': refsObras(3),
  'quienesSomos.titulo': linea,
  'quienesSomos.nota': linea,
  'quienesSomos.parrafos': listaTextos(6, 1200),
  'quienesSomos.cifras': listaObjetos(4, { valor: (v, c) => texto(v, 12, c), texto: linea }),
  'quienesSomos.obras': refsObras(2),
  'tecnicas.titulo': linea,
  'tecnicas.nota': linea,
  'tecnicas.lista': listaObjetos(TECNICAS.length, { id: idLinea, nombre: linea, descripcion: parrafo }, { id: TECNICAS }),
  'clases.titulo': linea,
  'clases.nota': linea,
  'clases.niveles': listaObjetos(3, { id: idLinea, nombre: linea, descripcion: parrafo }, { id: ['ninos', 'jovenes', 'adultos'] }),
  'clases.plan.nombre': linea,
  'clases.plan.precio': precio,
  'clases.plan.periodo': linea,
  'clases.plan.detalle': linea,
  'clases.plan.incluye': listaTextos(10, 160),
  'clases.plan.boton': linea,
  'galeria.titulo': linea,
  'galeria.nota': linea,
  'galeria.bajada': parrafo,
  'exposiciones.titulo': linea,
  'exposiciones.nota': linea,
  'exposiciones.texto': parrafo,
  'exposiciones.boton': linea,
  'contacto.titulo': linea,
  'contacto.nota': linea,
  'contacto.texto': parrafo,
  'contacto.botonWhatsapp': linea,
  'contacto.botonInstagram': linea,
}

export default protegido(async (req) => {
  if (req.method !== 'PATCH') return error('Método no permitido', 405)
  const cuerpo = await req.json().catch(() => null)
  const cambios = cuerpo?.cambios
  if (!cambios || typeof cambios !== 'object' || Array.isArray(cambios)) return error('No hay cambios para guardar')

  const set: Record<string, unknown> = {}
  for (const [ruta, valor] of Object.entries(cambios)) {
    const validar = CAMPOS[ruta]
    if (!validar) throw new ErrorVisible(`El campo "${ruta}" no se puede editar`)
    set[ruta] = validar(valor, ruta)
  }
  if (!Object.keys(set).length) return error('No hay cambios para guardar')

  const doc = await clienteEscritura().patch('sitio').set(set).commit()
  return json({ ok: true, sitio: doc })
})

export const config: Config = { path: '/api/sitio' }
