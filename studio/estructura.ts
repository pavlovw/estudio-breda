import type { StructureResolver } from 'sanity/structure'
import { CalendarIcon } from '@sanity/icons/Calendar'
import { CogIcon } from '@sanity/icons/Cog'
import { ImageIcon } from '@sanity/icons/Image'
import { StarIcon } from '@sanity/icons/Star'

// Menú del panel: simple y en el orden en que más se usa.
export const estructura: StructureResolver = (S) =>
  S.list()
    .title('Estudio BREDA')
    .items([
      S.listItem()
        .title('Galería de obras')
        .icon(ImageIcon)
        .child(
          S.documentTypeList('obra')
            .title('Obras')
            .defaultOrdering([
              { field: 'anio', direction: 'desc' },
              { field: 'mes', direction: 'desc' },
              { field: '_createdAt', direction: 'desc' },
            ]),
        ),
      S.listItem()
        .title('Obras destacadas')
        .icon(StarIcon)
        .child(S.documentTypeList('obra').title('Destacadas').filter('_type == "obra" && destacada == true')),
      S.divider(),
      S.listItem().title('Exposiciones').icon(CalendarIcon).child(S.documentTypeList('exposicion').title('Exposiciones')),
      S.divider(),
      // Documento único con todos los textos del sitio
      S.listItem().title('Textos del sitio').icon(CogIcon).child(S.document().schemaType('sitio').documentId('sitio').title('Textos del sitio')),
    ])
