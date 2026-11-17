import { defineConfig } from 'sanity'
import { structureTool } from 'sanity/structure'
import { esESLocale } from '@sanity/locale-es-es'
import { schemaTypes } from './schemas'
import { estructura } from './estructura'

const projectId = process.env.SANITY_STUDIO_PROJECT_ID || '4jx0qts1'
const dataset = process.env.SANITY_STUDIO_DATASET || 'production'

export default defineConfig({
  name: 'estudio-breda',
  title: 'Estudio BREDA · Panel',
  projectId,
  dataset,
  plugins: [structureTool({ structure: estructura }), esESLocale()],
  schema: {
    types: schemaTypes,
    // "Textos del sitio" es único: no se puede crear otro ni duplicar
    templates: (plantillas) => plantillas.filter((t) => t.schemaType !== 'sitio'),
  },
  document: {
    actions: (acciones, { schemaType }) =>
      schemaType === 'sitio' ? acciones.filter((a) => !['duplicate', 'delete', 'unpublish'].includes(a.action ?? '')) : acciones,
    newDocumentOptions: (opciones) => opciones.filter((o) => o.templateId !== 'sitio'),
  },
})
