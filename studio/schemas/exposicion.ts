import { defineArrayMember, defineField, defineType } from 'sanity'
import { CalendarIcon } from '@sanity/icons/Calendar'

export default defineType({
  name: 'exposicion',
  title: 'Exposición',
  type: 'document',
  icon: CalendarIcon,
  fields: [
    defineField({ name: 'nombre', title: 'Nombre', type: 'string', placeholder: 'Ej: Tercera exposición', validation: (r) => r.required() }),
    defineField({ name: 'numero', title: 'Número corto', description: 'Se muestra en grande, por ejemplo "3era".', type: 'string', validation: (r) => r.required().max(6) }),
    defineField({ name: 'fecha', title: 'Fecha', type: 'date', options: { dateFormat: 'DD-MM-YYYY' }, validation: (r) => r.required() }),
    defineField({ name: 'descripcion', title: 'Descripción', type: 'text', rows: 4 }),
    defineField({
      name: 'video',
      title: 'Video',
      description: 'Opcional. Sube un video corto (idealmente menos de 2 minutos).',
      type: 'file',
      options: { accept: 'video/*' },
    }),
    defineField({ name: 'portadaVideo', title: 'Portada del video', type: 'image', hidden: ({ document }) => !document?.video && !document?.videoRuta }),
    defineField({ name: 'videoRuta', title: 'Video guardado en el sitio', type: 'string', readOnly: true, hidden: ({ value }) => !value }),
    defineField({
      name: 'fotos',
      title: 'Fotos de la exposición',
      description: 'La primera foto es la portada. Puedes arrastrarlas para cambiar el orden.',
      type: 'array',
      of: [defineArrayMember({ type: 'image', options: { hotspot: true, accept: 'image/*' } })],
      options: { layout: 'grid' },
    }),
  ],
  orderings: [{ title: 'Más reciente primero', name: 'fecha', by: [{ field: 'fecha', direction: 'desc' }] }],
  preview: {
    select: { title: 'nombre', fecha: 'fecha', media: 'fotos.0' },
    prepare: ({ title, fecha, media }) => ({
      title,
      subtitle: fecha ? new Date(fecha + 'T12:00:00').toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' }) : '',
      media,
    }),
  },
})
