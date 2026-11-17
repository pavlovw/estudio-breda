// Ruta obras: la lógica está en servidor/rutas/obras.ts
import manejador from '../../../servidor/rutas/obras.ts'
import { parametros, type Contexto } from '../../../servidor/entorno.ts'

export const onRequest = (ctx: Contexto) => manejador(ctx.request, parametros(ctx))
