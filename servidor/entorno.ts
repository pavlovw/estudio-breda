// Variables de entorno y conexiones (bindings) de Cloudflare.
//
// En Cloudflare Pages llegan en cada petición (context.env); el middleware de
// functions/api las guarda aquí para que el resto del backend las lea con entorno().
// En Node (scripts y pruebas) se usa process.env.

/** Lo mínimo que usamos de Workers KV */
export type KV = {
  get(clave: string, tipo: 'json'): Promise<unknown>
  put(clave: string, valor: string, opciones?: { expirationTtl?: number }): Promise<void>
  delete(clave: string): Promise<void>
}

export type Entorno = {
  ADMIN_USUARIOS?: string
  SESSION_SECRET?: string
  SANITY_WRITE_TOKEN?: string
  SANITY_PROJECT_ID?: string
  SANITY_DATASET?: string
  /** Espacio KV "login-intentos" (ver wrangler.toml) */
  LOGIN_INTENTOS?: KV
}

let actual: Entorno = typeof process !== 'undefined' ? (process.env as Entorno) : {}

export const fijarEntorno = (e: Entorno) => {
  actual = e
}
export const entorno = (): Entorno => actual

/** Contexto que Cloudflare Pages entrega a cada función */
export type Contexto = {
  request: Request
  env: Entorno
  params: Record<string, string | string[]>
  next: () => Promise<Response>
}

/** Parámetros de la ruta ([id], [clave]) como texto simple */
export const parametros = (ctx: Contexto): Record<string, string> =>
  Object.fromEntries(Object.entries(ctx.params ?? {}).map(([k, v]) => [k, Array.isArray(v) ? v.join('/') : v]))
