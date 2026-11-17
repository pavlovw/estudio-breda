// Cliente de Sanity para leer lo último (sin caché). Usa el token si existe;
// si no, lee como público (el dataset es público).
import { createClient } from '@sanity/client'

export const clienteLectura = () =>
  createClient({
    projectId: process.env.SANITY_PROJECT_ID || '4jx0qts1',
    dataset: process.env.SANITY_DATASET || 'production',
    apiVersion: '2025-01-01',
    token: process.env.SANITY_WRITE_TOKEN || undefined,
    useCdn: false,
    perspective: 'published',
  })
