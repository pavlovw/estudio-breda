// Ruta login: la lógica está en servidor/rutas/login.ts
import manejador from '../../servidor/rutas/login.ts'
import type { Contexto } from '../../servidor/entorno.ts'

export const onRequest = (ctx: Contexto) => manejador(ctx.request)
