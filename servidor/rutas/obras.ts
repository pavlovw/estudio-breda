// Obras de la galería
//   POST   /api/obras        (multipart: foto, alumno, mes, anio, tecnica, destacada, titulo, edad, nivel) -> crea
//   PATCH  /api/obras/:id    (multipart o JSON con los campos a cambiar; "foto" opcional)                -> edita
//   DELETE /api/obras/:id                                                                                 -> borra
import { ErrorVisible, error, json, protegido } from '../http.ts'
import { NIVELES, TECNICAS, booleano, clienteEscritura, deLista, entero, subirFoto, texto } from '../sanity.ts'

const ID_VALIDO = /^obra-[A-Za-z0-9_-]{1,60}$/

async function leerCuerpo(req: Request): Promise<{ campos: Record<string, unknown>; foto: FormDataEntryValue | null }> {
  const tipo = req.headers.get('content-type') ?? ''
  if (tipo.includes('multipart/form-data')) {
    const fd = await req.formData()
    const campos: Record<string, unknown> = {}
    for (const [k, v] of fd.entries()) if (k !== 'foto') campos[k] = v
    return { campos, foto: fd.get('foto') }
  }
  return { campos: (await req.json()) ?? {}, foto: null }
}

/** Valida solo los campos presentes. `nueva` exige los obligatorios. */
function validar(c: Record<string, unknown>, nueva: boolean) {
  const datos: Record<string, unknown> = {}
  const quitar: string[] = []
  const tiene = (k: string) => k in c && c[k] !== undefined

  if (nueva || tiene('tecnica')) datos.tecnica = deLista(c.tecnica, TECNICAS, 'Técnica')
  if (nueva || tiene('mes')) datos.mes = entero(c.mes, 1, 12, 'Mes')
  if (nueva || tiene('anio')) datos.anio = entero(c.anio, 2000, 2100, 'Año')
  if (tiene('destacada') || nueva) datos.destacada = booleano(c.destacada)

  // Opcionales: si llegan vacíos, se borran (el sitio mostrará "alumno/a del taller", etc.)
  for (const [k, max, nombre] of [['alumno', 80, 'Nombre del alumno'], ['titulo', 120, 'Título']] as const) {
    if (!tiene(k)) continue
    const v = texto(c[k], max, nombre)
    v ? (datos[k] = v) : quitar.push(k)
  }
  if (tiene('edad')) {
    c.edad === '' || c.edad === null ? quitar.push('edad') : (datos.edad = entero(c.edad, 3, 110, 'Edad'))
  }
  if (tiene('nivel')) {
    c.nivel === '' || c.nivel === null ? quitar.push('nivel') : (datos.nivel = deLista(c.nivel, NIVELES, 'Grupo'))
  }
  return { datos, quitar }
}

export default async (req: Request, params: Record<string, string> = {}) =>
  protegido(async () => {
    const sanity = clienteEscritura()
    const id = params.id

    // ----- Crear -----
    if (req.method === 'POST' && !id) {
      const { campos, foto } = await leerCuerpo(req)
      const { datos } = validar(campos, true)
      const imagen = await subirFoto(foto)
      const doc = await sanity.create({ _id: `obra-${crypto.randomUUID()}`, _type: 'obra', foto: imagen, ...datos })
      return json({ ok: true, obra: doc }, 201)
    }

    if (!id || !ID_VALIDO.test(id)) return error('Obra no encontrada', 404)
    const actual = await sanity.getDocument(id)
    if (!actual || actual._type !== 'obra') return error('Obra no encontrada', 404)

    // ----- Editar -----
    if (req.method === 'PATCH') {
      const { campos, foto } = await leerCuerpo(req)
      const { datos, quitar } = validar(campos, false)
      if (foto instanceof File && foto.size > 0) datos.foto = await subirFoto(foto)
      if (!Object.keys(datos).length && !quitar.length) throw new ErrorVisible('No hay cambios para guardar')
      const doc = await sanity.patch(id).set(datos).unset(quitar).commit()
      return json({ ok: true, obra: doc })
    }

    // ----- Borrar -----
    if (req.method === 'DELETE') {
      await sanity.delete(id)
      return json({ ok: true })
    }

    return error('Método no permitido', 405)
  })(req)

