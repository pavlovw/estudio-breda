import { defineArrayMember, defineField, defineType } from 'sanity'
import { CogIcon } from '@sanity/icons/Cog'

// Atajos para que el formulario sea fácil de leer
const linea = (name: string, title: string, description?: string) => defineField({ name, title, description, type: 'string' })
const parrafo = (name: string, title: string, rows = 3, description?: string) => defineField({ name, title, description, type: 'text', rows })
const seccion = (name: string, title: string, group: string, fields: ReturnType<typeof defineField>[]) =>
  defineField({ name, title, type: 'object', group, options: { collapsible: false }, fields })
const refObras = (name: string, title: string, max: number, description: string) =>
  defineField({
    name,
    title,
    description,
    type: 'array',
    of: [defineArrayMember({ type: 'reference', to: [{ type: 'obra' }] })],
    validation: (r) => r.max(max),
  })

export default defineType({
  name: 'sitio',
  title: 'Textos del sitio',
  type: 'document',
  icon: CogIcon,
  groups: [
    { name: 'general', title: 'General', default: true },
    { name: 'portada', title: 'Portada' },
    { name: 'quienes', title: 'Quiénes somos' },
    { name: 'breda', title: '¿Por qué Breda?' },
    { name: 'tecnicas', title: 'Técnicas' },
    { name: 'clases', title: 'Clases y precio' },
    { name: 'galeria', title: 'Galería' },
    { name: 'exposiciones', title: 'Exposiciones' },
    { name: 'contacto', title: 'Contacto' },
  ],
  fields: [
    defineField({ ...linea('nombre', 'Nombre corto'), group: 'general' }),
    defineField({ ...linea('nombreCompleto', 'Nombre completo'), group: 'general' }),
    defineField({ name: 'whatsapp', title: 'Enlace de WhatsApp', type: 'url', group: 'general' }),
    defineField({ name: 'instagram', title: 'Enlace de Instagram', type: 'url', group: 'general' }),
    defineField({ ...linea('instagramUsuario', 'Usuario de Instagram', 'Ej: @estudiobreda_arte'), group: 'general' }),

    seccion('hero', 'Portada', 'portada', [
      linea('antetitulo', 'Texto pequeño sobre el título'),
      linea('titulo', 'Título principal'),
      linea('palabraDestacada', 'Palabra destacada', 'Una palabra del título que se pinta de color (en minúsculas).'),
      parrafo('bajada', 'Texto bajo el título'),
      linea('botonPrincipal', 'Botón principal'),
      linea('botonSecundario', 'Botón secundario'),
      refObras('obras', 'Obras del collage', 3, 'Elige hasta 3 obras. Si lo dejas vacío se usan las destacadas.'),
    ]),

    seccion('quienesSomos', 'Quiénes somos', 'quienes', [
      linea('titulo', 'Título'),
      linea('nota', 'Nota escrita a mano'),
      defineField({ name: 'parrafos', title: 'Párrafos', type: 'array', of: [defineArrayMember({ type: 'text', rows: 3 })] }),
      defineField({
        name: 'cifras',
        title: 'Cifras',
        type: 'array',
        of: [defineArrayMember({ type: 'object', fields: [linea('valor', 'Número'), linea('texto', 'Texto')], preview: { select: { title: 'valor', subtitle: 'texto' } } })],
        validation: (r) => r.max(4),
      }),
      refObras('obras', 'Obras de esta sección', 2, 'Elige 2 obras. Si lo dejas vacío se usan las destacadas.'),
    ]),

    seccion('porQueBreda', '¿Por qué Breda?', 'breda', [
      linea('titulo', 'Título'),
      linea('nota', 'Nota escrita a mano'),
      defineField({ name: 'parrafos', title: 'Párrafos', type: 'array', of: [defineArrayMember({ type: 'text', rows: 3 })] }),
      defineField({ name: 'foto', title: 'Foto de Breda (Girona)', description: 'Horizontal, se muestra como postal.', type: 'image', options: { hotspot: true } }),
      linea('pie', 'Texto escrito en la postal', 'Ej: Breda, Girona · Catalunya'),
    ]),

    seccion('tecnicas', 'Técnicas', 'tecnicas', [
      linea('titulo', 'Título'),
      linea('nota', 'Nota escrita a mano'),
      defineField({
        name: 'lista',
        title: 'Técnicas',
        description: 'Puedes cambiar el nombre y la descripción. No borres técnicas: las obras dependen de ellas.',
        type: 'array',
        of: [
          defineArrayMember({
            type: 'object',
            fields: [
              defineField({ name: 'id', title: 'Código', type: 'string', readOnly: true }),
              linea('nombre', 'Nombre'),
              parrafo('descripcion', 'Descripción', 2),
            ],
            preview: { select: { title: 'nombre', subtitle: 'descripcion' } },
          }),
        ],
      }),
    ]),

    seccion('clases', 'Clases y precio', 'clases', [
      linea('titulo', 'Título'),
      linea('nota', 'Nota escrita a mano'),
      defineField({
        name: 'niveles',
        title: 'Grupos',
        type: 'array',
        of: [
          defineArrayMember({
            type: 'object',
            fields: [defineField({ name: 'id', title: 'Código', type: 'string', readOnly: true }), linea('nombre', 'Nombre'), parrafo('descripcion', 'Descripción', 2)],
            preview: { select: { title: 'nombre', subtitle: 'descripcion' } },
          }),
        ],
      }),
      defineField({
        name: 'planes',
        title: 'Modalidades y precios',
        description: 'Cada una se muestra como una paleta de pintor.',
        type: 'array',
        of: [
          defineArrayMember({
            type: 'object',
            fields: [
              linea('nombre', 'Nombre', 'Ej: Mensualidad'),
              linea('detalle', 'Frecuencia', 'Ej: 1 vez por semana'),
              defineField({ name: 'precio', title: 'Precio (en pesos, sin puntos)', type: 'number', validation: (r) => r.required().min(0) }),
              linea('periodo', 'Junto al precio', 'Ej: al mes, por clase'),
              linea('extra', 'Nota chica (opcional)'),
            ],
            preview: { select: { title: 'detalle', subtitle: 'nombre' } },
          }),
        ],
      }),
      defineField({
        name: 'plan',
        title: 'Lo que incluyen todas y botón',
        type: 'object',
        fields: [
          linea('nombre', 'Nombre del plan'),
          defineField({ name: 'precio', title: 'Precio (en pesos, sin puntos)', type: 'number', validation: (r) => r.required().min(0) }),
          defineField({ name: 'moneda', title: 'Moneda', type: 'string', initialValue: 'CLP', hidden: true }),
          linea('periodo', 'Periodo', 'Ej: al mes'),
          linea('detalle', 'Detalle', 'Ej: 2 clases a la semana'),
          defineField({ name: 'incluye', title: 'Qué incluye', type: 'array', of: [defineArrayMember({ type: 'string' })] }),
          linea('boton', 'Texto del botón'),
        ],
      }),
    ]),

    seccion('galeria', 'Galería', 'galeria', [linea('titulo', 'Título'), linea('nota', 'Nota escrita a mano'), parrafo('bajada', 'Texto')]),

    seccion('exposiciones', 'Exposiciones (textos generales)', 'exposiciones', [
      linea('titulo', 'Título'),
      linea('nota', 'Nota escrita a mano'),
      parrafo('texto', 'Texto'),
      linea('boton', 'Texto del botón'),
    ]),

    seccion('contacto', 'Contacto', 'contacto', [
      linea('titulo', 'Título'),
      linea('nota', 'Nota escrita a mano'),
      parrafo('texto', 'Texto'),
      linea('botonWhatsapp', 'Botón de WhatsApp'),
      linea('botonInstagram', 'Botón de Instagram'),
    ]),
  ],
  preview: { prepare: () => ({ title: 'Textos del sitio' }) },
})
