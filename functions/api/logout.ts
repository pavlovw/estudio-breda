// Ruta sesion: la lógica está en servidor/rutas/sesion.ts
import manejador from '../../servidor/rutas/sesion.ts'
import type { Contexto } from '../../servidor/entorno.ts'

export const onRequest = (ctx: Contexto) => manejador(ctx.request)
