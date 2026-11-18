// Ruta publicar: la lógica está en servidor/rutas/publicar.ts
import manejador from '../../servidor/rutas/publicar.ts'
import type { Contexto } from '../../servidor/entorno.ts'

export const onRequest = (ctx: Contexto) => manejador(ctx.request)
