// Fotos del sitio (no de obras)
//   POST /api/sitio/foto  (multipart: campo, foto)  -> reemplaza esa foto
import { ErrorVisible, error, json, protegido } from '../http.ts'
import { clienteEscritura, subirFoto } from '../sanity.ts'

/** Fotos que se pueden cambiar desde el modo edición */
const FOTOS = ['porQueBreda.foto']

export default protegido(async (req) => {
  if (req.method !== 'POST') return error('Método no permitido', 405)
  const fd = await req.formData()
  const campo = String(fd.get('campo') ?? '')
  if (!FOTOS.includes(campo)) throw new ErrorVisible('Esa foto no se puede cambiar')
  const imagen = await subirFoto(fd.get('foto'))
  await clienteEscritura().patch('sitio').set({ [campo]: imagen }).commit()
  return json({ ok: true })
})
