// POST /api/login  { correo, password }  -> crea la sesión (cookie)
import type { Config } from '@netlify/functions'
import { getStore } from '@netlify/blobs'
import { comprobarCredenciales, cookieSesion, crearToken } from '../lib/auth.mts'
import { error, json, mismoOrigen } from '../lib/http.mts'

const MAX_INTENTOS = 5
const BLOQUEO_MIN = 15

type Intentos = { n: number; hasta?: number }

export default async (req: Request) => {
  if (req.method !== 'POST') return error('Método no permitido', 405)
  if (!mismoOrigen(req)) return error('Petición no permitida', 403)

  let correo = ''
  let password = ''
  try {
    const cuerpo = await req.json()
    correo = String(cuerpo.correo ?? '').trim().toLowerCase().slice(0, 200)
    password = String(cuerpo.password ?? '').slice(0, 200)
  } catch {
    return error('Datos inválidos')
  }
  if (!correo || !password) return error('Escribe tu correo y contraseña')

  // Freno contra intentos repetidos (por correo)
  const store = getStore('login-intentos')
  const clave = correo.replace(/[^a-z0-9@._-]/g, '_')
  const previo = ((await store.get(clave, { type: 'json' })) as Intentos | null) ?? { n: 0 }
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
    await store.setJSON(clave, n >= MAX_INTENTOS ? { n, hasta: Date.now() + BLOQUEO_MIN * 60000 } : { n })
    return error('Correo o contraseña incorrectos', 401)
  }

  await store.delete(clave)
  return json({ ok: true, correo }, 200, { 'set-cookie': cookieSesion(crearToken(correo)) })
}

export const config: Config = { path: '/api/login' }
