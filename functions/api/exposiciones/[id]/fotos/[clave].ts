// Ruta exposiciones: la lógica está en servidor/rutas/exposiciones.ts
import manejador from '../../../../../servidor/rutas/exposiciones.ts'
import { parametros, type Contexto } from '../../../../../servidor/entorno.ts'

export const onRequest = (ctx: Contexto) => manejador(ctx.request, parametros(ctx))
