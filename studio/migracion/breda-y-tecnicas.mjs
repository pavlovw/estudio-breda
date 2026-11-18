// Agrega la sección "¿Por qué Breda?" y 3 técnicas nuevas al documento "sitio".
// No pisa nada que ya exista.
//   npx sanity exec migracion/breda-y-tecnicas.mjs --with-user-token
import { readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { getCliClient } from 'sanity/cli'

const local = JSON.parse(readFileSync(new URL('../../src/data/sitio.json', import.meta.url), 'utf8'))
const cliente = getCliClient({ apiVersion: '2025-01-01' })
const sitio = await cliente.getDocument('sitio')

const existentes = new Set((sitio.tecnicas?.lista ?? []).map((t) => t.id))
const nuevas = local.tecnicas.lista.filter((t) => !existentes.has(t.id)).map((t) => ({ _key: randomUUID().slice(0, 12), ...t }))

let p = cliente.patch('sitio').setIfMissing({ porQueBreda: local.porQueBreda })
if (nuevas.length) p = p.setIfMissing({ 'tecnicas.lista': [] }).append('tecnicas.lista', nuevas)
await p.commit()
console.log('Técnicas agregadas:', nuevas.map((t) => t.nombre).join(', ') || 'ninguna')
console.log('¿Por qué Breda?:', sitio.porQueBreda ? 'ya existía' : 'creada')
