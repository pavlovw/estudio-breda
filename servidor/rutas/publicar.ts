// POST /api/publicar  -> pide a Cloudflare que vuelva a armar el sitio (una vez por tanda de cambios)
// El enlace (deploy hook) vive en el secreto DEPLOY_HOOK_URL. Si no está configurado,
// no hace nada: en ese caso publica el webhook de Sanity.
import { entorno } from '../entorno.ts'
import { ErrorVisible, error, json, protegido } from '../http.ts'

export default protegido(async (req) => {
  if (req.method !== 'POST') return error('Método no permitido', 405)
  const hook = entorno().DEPLOY_HOOK_URL
  if (!hook) return json({ ok: true, omitido: true })
  if (!/^https:\/\/api\.cloudflare\.com\/\S+$/.test(hook)) throw new ErrorVisible('DEPLOY_HOOK_URL no es un enlace de Cloudflare válido', 500)
  const r = await fetch(hook, { method: 'POST' })
  if (!r.ok) throw new ErrorVisible('Cloudflare no aceptó la publicación. Intenta de nuevo en un rato.', 502)
  return json({ ok: true })
})
