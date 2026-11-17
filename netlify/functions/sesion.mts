// GET  /api/sesion  -> ¿hay sesión iniciada?
// POST /api/logout  -> cerrar sesión
import type { Config } from '@netlify/functions'
import { cookieBorrada, sesion } from '../lib/auth.mts'
import { error, json, mismoOrigen } from '../lib/http.mts'

export default async (req: Request) => {
  const ruta = new URL(req.url).pathname
  if (ruta === '/api/logout') {
    if (req.method !== 'POST') return error('Método no permitido', 405)
    if (!mismoOrigen(req)) return error('Petición no permitida', 403)
    return json({ ok: true }, 200, { 'set-cookie': cookieBorrada() })
  }
  try {
    const u = sesion(req)
    return json(u ? { ok: true, correo: u.correo } : { ok: false }, u ? 200 : 401)
  } catch (e) {
    console.error(e)
    return error('El acceso no está configurado todavía', 500)
  }
}

export const config: Config = { path: ['/api/sesion', '/api/logout'] }
