// Se ejecuta antes de cada /api/*: deja disponibles las variables y el KV.
import { fijarEntorno, type Contexto } from '../../servidor/entorno.ts'

export const onRequest = (ctx: Contexto) => {
  fijarEntorno(ctx.env)
  return ctx.next()
}
