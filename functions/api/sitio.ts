// Ruta sitio: la lógica está en servidor/rutas/sitio.ts
import manejador from '../../servidor/rutas/sitio.ts'
import type { Contexto } from '../../servidor/entorno.ts'

export const onRequest = (ctx: Contexto) => manejador(ctx.request)
