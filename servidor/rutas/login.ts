// POST /api/login  { correo, password }  -> crea la sesión (cookie)
import { comprobarCredenciales, cookieSesion, crearToken } from '../auth.ts'
import { entorno } from '../entorno.ts'
import { error, json, mismoOrigen } from '../http.ts'

const MAX_INTENTOS = 5
const BLOQUEO_MIN = 15

type Intentos = { n: number; hasta?: number }

export default async (req: Request) => {
  if (req.method !== 'POST') return error('Método no permitido', 405)
  if (!mismoOrigen(req)) return error('Petición no permitida', 403)

  let correo = ''
  let password = ''
  try {
    const cuerpo = (await req.json()) as { correo?: unknown; password?: unknown }
    correo = String(cuerpo.correo ?? '').trim().toLowerCase().slice(0, 200)
    password = String(cuerpo.password ?? '').slice(0, 200)
  } catch {
    return error('Datos inválidos')
  }
  if (!correo || !password) return error('Escribe tu correo y contraseña')

  // Freno contra intentos repetidos (por correo), guardado en Workers KV
  const kv = entorno().LOGIN_INTENTOS
  if (!kv) {
    console.error('Falta el espacio KV LOGIN_INTENTOS (wrangler.toml)')
    return error('El acceso no está configurado todavía', 500)
  }
  const clave = `intentos:${correo.replace(/[^a-z0-9@._-]/g, '_')}`
  const previo = ((await kv.get(clave, 'json')) as Intentos | null) ?? { n: 0 }
  if (previo.hasta && previo.hasta > Date.now()) {
    const min = Math.ceil((previo.hasta - Date.now()) / 60000)
    return error(`Demasiados intentos. Espera ${min} minuto${min === 1 ? '' : 's'} e intenta de nuevo.`, 429)
  }

  let ok = false
  try {
    ok = comprobarCredenciales(correo, password)
  } catch (e) {
    console.error(e)
    return error('El acceso no está configurado todavía', 500)
  }

  if (!ok) {
    const n = (previo.hasta ? 0 : previo.n) + 1
    const nuevo: Intentos = n >= MAX_INTENTOS ? { n, hasta: Date.now() + BLOQUEO_MIN * 60000 } : { n }
    // se olvida solo después del bloqueo (KV exige al menos 60 s)
    await kv.put(clave, JSON.stringify(nuevo), { expirationTtl: BLOQUEO_MIN * 60 })
    return error('Correo o contraseña incorrectos', 401)
  }

  if (previo.n) await kv.delete(clave)
  return json({ ok: true, correo }, 200, { 'set-cookie': cookieSesion(crearToken(correo)) })
}
