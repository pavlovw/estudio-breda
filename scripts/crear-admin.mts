// Crea las credenciales de un usuario del panel /admin.
//
//   npm run crear-admin
//
// Pide correo y contraseña (la contraseña no se muestra al escribirla) y entrega
// el texto para la variable ADMIN_USUARIOS de Netlify. La contraseña en sí no se
// guarda en ninguna parte: solo su versión cifrada (hash).
import { randomBytes } from 'node:crypto'
import { createInterface } from 'node:readline'
import { crearHash } from '../netlify/lib/auth.mts'

function preguntar(texto: string, oculto = false): Promise<string> {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true })
    if (oculto) {
      // no repetir en pantalla lo que se escribe
      ;(rl as unknown as { _writeToOutput: (s: string) => void })._writeToOutput = (s: string) => {
        if (s.includes(texto)) process.stdout.write(s)
        else if (s.includes('\n') || s.includes('\r')) process.stdout.write('\n')
        else process.stdout.write('•')
      }
    }
    rl.question(texto, (r) => {
      rl.close()
      resolve(r)
    })
  })
}

const correo = (await preguntar('Correo: ')).trim().toLowerCase()
if (!/^[^\s@,:]+@[^\s@,:]+\.[^\s@,:]+$/.test(correo)) {
  console.error('\nEse correo no es válido.')
  process.exit(1)
}
const p1 = await preguntar('Contraseña (mínimo 10 caracteres): ', true)
if (p1.length < 10) {
  console.error('\nLa contraseña debe tener al menos 10 caracteres.')
  process.exit(1)
}
const p2 = await preguntar('Repite la contraseña: ', true)
if (p1 !== p2) {
  console.error('\nLas contraseñas no coinciden.')
  process.exit(1)
}

const linea = `${correo}:${crearHash(p1)}`
console.log('\n✅ Listo. En Netlify → Site configuration → Environment variables:\n')
console.log('1) Variable ADMIN_USUARIOS  (si ya existe, agrega esto al final separado por una coma)\n')
console.log(linea)
console.log('\n2) Variable SESSION_SECRET  (solo la primera vez; si ya existe, no la cambies)\n')
console.log(randomBytes(32).toString('base64url'))
console.log('\nMarca ambas como "secret" y luego vuelve a publicar el sitio (Deploys → Trigger deploy).\n')
