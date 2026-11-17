// Autenticación del panel /admin.
//
// Usuarios: variable de entorno ADMIN_USUARIOS con el formato
//   correo1:hash1,correo2:hash2
// (el hash se genera con `npm run crear-admin`; la contraseña nunca se guarda tal cual)
//
// Sesión: cookie HttpOnly firmada con HMAC usando SESSION_SECRET.

import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'

export const COOKIE = 'breda_sesion'
const DURACION_SEG = 60 * 60 * 24 * 14 // 14 días

// ---------- Contraseñas (scrypt) ----------
const N = 16384, R = 8, P = 1, LARGO = 64

export function crearHash(password: string): string {
  const sal = randomBytes(16)
  const h = scryptSync(password.normalize('NFKC'), sal, LARGO, { N, r: R, p: P })
  return ['scrypt', N, R, P, sal.toString('base64url'), h.toString('base64url')].join('$')
}

export function verificarPassword(password: string, guardado: string): boolean {
  const [alg, n, r, p, salB64, hashB64] = guardado.split('$')
  if (alg !== 'scrypt' || !salB64 || !hashB64) return false
  const esperado = Buffer.from(hashB64, 'base64url')
  const h = scryptSync(password.normalize('NFKC'), Buffer.from(salB64, 'base64url'), esperado.length, {
    N: Number(n), r: Number(r), p: Number(p),
  })
  return h.length === esperado.length && timingSafeEqual(h, esperado)
}

/** Lee ADMIN_USUARIOS -> Map(correo -> hash) */
export function usuarios(): Map<string, string> {
  const m = new Map<string, string>()
  for (const par of (process.env.ADMIN_USUARIOS ?? '').split(',')) {
    const i = par.indexOf(':')
    if (i > 0) m.set(par.slice(0, i).trim().toLowerCase(), par.slice(i + 1).trim())
  }
  return m
}

// Hash falso para que un correo inexistente tarde lo mismo que uno real
const HASH_SEÑUELO = crearHash(randomBytes(12).toString('hex'))

export function comprobarCredenciales(correo: string, password: string): boolean {
  const hash = usuarios().get(correo.trim().toLowerCase())
  const ok = verificarPassword(password, hash ?? HASH_SEÑUELO)
  return Boolean(hash) && ok
}

// ---------- Sesión firmada ----------
function secreto(): string {
  const s = process.env.SESSION_SECRET ?? ''
  if (s.length < 32) throw new Error('Falta SESSION_SECRET (mínimo 32 caracteres) en Netlify')
  return s
}
const firmar = (datos: string) => createHmac('sha256', secreto()).update(datos).digest('base64url')

export function crearToken(correo: string): string {
  const datos = Buffer.from(JSON.stringify({ c: correo, exp: Math.floor(Date.now() / 1000) + DURACION_SEG })).toString('base64url')
  return `${datos}.${firmar(datos)}`
}

export function leerToken(token: string | undefined): { correo: string } | null {
  if (!token) return null
  const [datos, firma] = token.split('.')
  if (!datos || !firma) return null
  const esperada = Buffer.from(firmar(datos))
  const recibida = Buffer.from(firma)
  if (esperada.length !== recibida.length || !timingSafeEqual(esperada, recibida)) return null
  try {
    const { c, exp } = JSON.parse(Buffer.from(datos, 'base64url').toString())
    if (typeof c !== 'string' || typeof exp !== 'number' || exp < Date.now() / 1000) return null
    // si quitaron al usuario de ADMIN_USUARIOS, su sesión deja de valer
    if (!usuarios().has(c)) return null
    return { correo: c }
  } catch {
    return null
  }
}

export function cookieSesion(token: string): string {
  return `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${DURACION_SEG}`
}
export function cookieBorrada(): string {
  return `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`
}

export function leerCookie(req: Request, nombre = COOKIE): string | undefined {
  const c = req.headers.get('cookie') ?? ''
  for (const parte of c.split(';')) {
    const [k, ...v] = parte.trim().split('=')
    if (k === nombre) return v.join('=')
  }
  return undefined
}

/** Devuelve el usuario de la sesión o null. */
export function sesion(req: Request): { correo: string } | null {
  return leerToken(leerCookie(req))
}
