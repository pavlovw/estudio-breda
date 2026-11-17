// Ruta contenido: la lógica está en servidor/rutas/contenido.ts
import manejador from '../../servidor/rutas/contenido.ts'
import type { Contexto } from '../../servidor/entorno.ts'

export const onRequest = (ctx: Contexto) => manejador(ctx.request)
