// Cliente de Sanity para leer lo último (sin caché). Usa el token si existe;
// si no, lee como público (el dataset es público).
import { createClient } from '@sanity/client'
import { entorno } from './entorno.ts'

export const clienteLectura = () => {
  const env = entorno()
  return createClient({
    projectId: env.SANITY_PROJECT_ID || '4jx0qts1',
    dataset: env.SANITY_DATASET || 'production',
    apiVersion: '2025-01-01',
    token: env.SANITY_WRITE_TOKEN || undefined,
    useCdn: false,
    perspective: 'published',
  })
}
