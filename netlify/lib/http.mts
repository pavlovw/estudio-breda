// Utilidades HTTP compartidas por las funciones del panel.
import { sesion } from './auth.mts'

export const json = (datos: unknown, status = 200, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(datos), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...extra },
  })

export const error = (mensaje: string, status = 400) => json({ ok: false, error: mensaje }, status)

/**
 * Protección contra peticiones desde otros sitios (CSRF):
 * las peticiones que cambian datos deben venir de nuestro propio dominio.
 */
export function mismoOrigen(req: Request): boolean {
  const origen = req.headers.get('origin')
  if (!origen) return false
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host')
  try {
    return new URL(origen).host === host
  } catch {
    return false
  }
}

type Manejador = (req: Request, usuario: { correo: string }) => Promise<Response>

/** Envuelve una función para exigir sesión iniciada y mismo origen. */
export function protegido(fn: Manejador) {
  return async (req: Request): Promise<Response> => {
    try {
      const usuario = sesion(req)
      if (!usuario) return error('Tu sesión expiró. Vuelve a iniciar sesión.', 401)
      if (req.method !== 'GET' && !mismoOrigen(req)) return error('Petición no permitida', 403)
      return await fn(req, usuario)
    } catch (e) {
      if (!(e instanceof ErrorVisible) || e.status >= 500) console.error(e)
      const msg = e instanceof ErrorVisible ? e.message : 'Ocurrió un error inesperado. Intenta de nuevo.'
      return error(msg, e instanceof ErrorVisible ? e.status : 500)
    }
  }
}

/** Error con un mensaje que sí se puede mostrar a la usuaria. */
export class ErrorVisible extends Error {
  status: number
  constructor(mensaje: string, status = 400) {
    super(mensaje)
    this.status = status
  }
}
