// Prueba del webhook: cambia temporalmente el texto pequeño de la portada.
// Uso: npx sanity exec migracion/prueba-webhook.mjs --with-user-token -- poner|quitar
import { getCliClient } from 'sanity/cli'

const cliente = getCliClient({ apiVersion: '2025-01-01' })
const ORIGINAL = 'Estudio de arte y dibujo'
const PRUEBA = 'Estudio de arte y dibujo ✓'
const modo = process.argv.at(-1)

const nuevo = modo === 'quitar' ? ORIGINAL : PRUEBA
await cliente.patch('sitio').set({ 'hero.antetitulo': nuevo }).commit()
console.log(`Publicado: "${nuevo}"`)
