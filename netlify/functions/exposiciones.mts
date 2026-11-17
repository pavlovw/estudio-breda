// Exposiciones
//   POST   /api/exposiciones                     { nombre, numero, fecha, descripcion }  -> crea
//   PATCH  /api/exposiciones/:id                 { campos a cambiar }                    -> edita
//   DELETE /api/exposiciones/:id                                                         -> borra
//   POST   /api/exposiciones/:id/fotos           (multipart: foto)                       -> agrega una foto al final
//   PATCH  /api/exposiciones/:id/fotos           { orden: [_key, …] }                    -> reordena
//   DELETE /api/exposiciones/:id/fotos/:clave                                            -> quita una foto
// (Los videos son muy pesados para subirlos por aquí: se cambian desde el panel de Sanity.)
import type { Config, Context } from '@netlify/functions'
import { randomUUID } from 'node:crypto'
import { ErrorVisible, error, json, protegido } from '../lib/http.mts'
import { clienteEscritura, subirFoto, texto } from '../lib/sanity.mts'

const ID_VALIDO = /^exposicion-[A-Za-z0-9_-]{1,60}$/
const FECHA = /^\d{4}-\d{2}-\d{2}$/

function validar(c: Record<string, unknown>, nueva: boolean) {
  const datos: Record<string, unknown> = {}
  const tiene = (k: string) => k in c
  if (nueva || tiene('nombre')) {
    datos.nombre = texto(c.nombre, 80, 'Nombre')
    if (!datos.nombre) throw new ErrorVisible('Falta el nombre de la exposición')
  }
  if (nueva || tiene('numero')) {
    datos.numero = texto(c.numero, 6, 'Número corto')
    if (!datos.numero) throw new ErrorVisible('Falta el número corto (ej: "3era")')
  }
  if (nueva || tiene('fecha')) {
    if (typeof c.fecha !== 'string' || !FECHA.test(c.fecha) || Number.isNaN(Date.parse(c.fecha))) throw new ErrorVisible('La fecha no es válida')
    datos.fecha = c.fecha
  }
  if (tiene('descripcion')) datos.descripcion = texto(c.descripcion, 1200, 'Descripción')
  return datos
}

export default async (req: Request, context: Context) =>
  protegido(async () => {
    const sanity = clienteEscritura()
    const { id, clave } = context.params ?? {}
    const enFotos = new URL(req.url).pathname.includes('/fotos')

    // ----- Crear exposición -----
    if (!id) {
      if (req.method !== 'POST') return error('Método no permitido', 405)
      const datos = validar((await req.json().catch(() => ({}))) ?? {}, true)
      const doc = await sanity.create({ _id: `exposicion-${randomUUID()}`, _type: 'exposicion', fotos: [], ...datos })
      return json({ ok: true, exposicion: doc }, 201)
    }

    if (!ID_VALIDO.test(id)) return error('Exposición no encontrada', 404)
    const actual = await sanity.getDocument(id)
    if (!actual || actual._type !== 'exposicion') return error('Exposición no encontrada', 404)
    const fotos = (actual.fotos as { _key: string }[] | undefined) ?? []

    // ----- Fotos -----
    if (enFotos) {
      if (req.method === 'POST' && !clave) {
        const fd = await req.formData()
        const imagen = await subirFoto(fd.get('foto'))
        const nueva = { ...imagen, _key: randomUUID().slice(0, 12) }
        await sanity.patch(id).setIfMissing({ fotos: [] }).append('fotos', [nueva]).commit()
        return json({ ok: true, foto: nueva }, 201)
      }
      if (req.method === 'PATCH' && !clave) {
        const { orden } = (await req.json().catch(() => ({}))) ?? {}
        const actuales = new Set(fotos.map((f) => f._key))
        if (!Array.isArray(orden) || orden.length !== fotos.length || !orden.every((k) => actuales.has(k)))
          throw new ErrorVisible('El nuevo orden no coincide con las fotos actuales')
        const porClave = new Map(fotos.map((f) => [f._key, f]))
        await sanity.patch(id).set({ fotos: orden.map((k: string) => porClave.get(k)) }).commit()
        return json({ ok: true })
      }
      if (req.method === 'DELETE' && clave) {
        if (!fotos.some((f) => f._key === clave)) return error('Foto no encontrada', 404)
        await sanity.patch(id).unset([`fotos[_key=="${clave.replace(/[^A-Za-z0-9_-]/g, '')}"]`]).commit()
        return json({ ok: true })
      }
      return error('Método no permitido', 405)
    }

    // ----- Editar / borrar exposición -----
    if (req.method === 'PATCH') {
      const datos = validar((await req.json().catch(() => ({}))) ?? {}, false)
      if (!Object.keys(datos).length) throw new ErrorVisible('No hay cambios para guardar')
      const doc = await sanity.patch(id).set(datos).commit()
      return json({ ok: true, exposicion: doc })
    }
    if (req.method === 'DELETE') {
      await sanity.delete(id)
      return json({ ok: true })
    }
    return error('Método no permitido', 405)
  })(req)

export const config: Config = {
  path: ['/api/exposiciones', '/api/exposiciones/:id', '/api/exposiciones/:id/fotos', '/api/exposiciones/:id/fotos/:clave'],
}
