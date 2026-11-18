// Ruta sitio-foto: la lógica está en servidor/rutas/sitio-foto.ts
import manejador from '../../../servidor/rutas/sitio-foto.ts'
import type { Contexto } from '../../../servidor/entorno.ts'

export const onRequest = (ctx: Contexto) => manejador(ctx.request)
