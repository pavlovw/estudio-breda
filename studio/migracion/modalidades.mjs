// Agrega las 4 modalidades de clases (si no existen) y quita de "lo que incluyen
// todas" el ítem de cantidad de clases, que ahora va en cada modalidad.
//   npx sanity exec migracion/modalidades.mjs --with-user-token
import { readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { getCliClient } from 'sanity/cli'

const local = JSON.parse(readFileSync(new URL('../../src/data/sitio.json', import.meta.url), 'utf8'))
const cliente = getCliClient({ apiVersion: '2025-01-01' })
const sitio = await cliente.getDocument('sitio')
if (sitio.clases?.planes?.length) {
  console.log('Las modalidades ya existían: no se tocó nada.')
} else {
  const planes = local.clases.planes.map((p) => ({ _key: randomUUID().slice(0, 12), ...p }))
  const incluye = (sitio.clases?.plan?.incluye ?? []).filter((x) => !/clases al mes/i.test(x))
  await cliente.patch('sitio').set({ 'clases.planes': planes, 'clases.plan.incluye': incluye }).commit()
  console.log('Modalidades:', planes.map((p) => p.detalle + ' $' + p.precio).join(' | '))
  console.log('Incluyen todas:', incluye.join(' | '))
}
