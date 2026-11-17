import { defineField, defineType } from 'sanity'
import { ImageIcon } from '@sanity/icons/Image'
import { MESES, NIVELES, TECNICAS, nombreMes, nombreTecnica } from './comun'

const hoy = new Date()

export default defineType({
  name: 'obra',
  title: 'Obra',
  type: 'document',
  icon: ImageIcon,
  fields: [
    defineField({
      name: 'foto',
      title: 'Foto de la obra',
      description: 'Toca para sacar una foto con la cámara o elegir una de la galería del teléfono.',
      type: 'image',
      options: { hotspot: true, accept: 'image/*' },
      validation: (r) => r.required().error('Falta la foto de la obra'),
    }),
    defineField({
      name: 'alumno',
      title: 'Nombre del alumno o alumna',
      description: 'Opcional. Si lo dejas vacío, en el sitio aparecerá "alumno/a del taller".',
      type: 'string',
    }),
    defineField({
      name: 'mes',
      title: 'Mes',
      type: 'number',
      options: { list: MESES, layout: 'dropdown' },
      initialValue: hoy.getMonth() + 1,
      validation: (r) => r.required().error('Elige el mes'),
      fieldset: 'fecha',
    }),
    defineField({
      name: 'anio',
      title: 'Año',
      type: 'number',
      initialValue: hoy.getFullYear(),
      validation: (r) => r.required().integer().min(2020).max(2100).error('Escribe el año (por ejemplo 2026)'),
      fieldset: 'fecha',
    }),
    defineField({
      name: 'tecnica',
      title: 'Técnica',
      type: 'string',
      options: { list: TECNICAS, layout: 'radio' },
      validation: (r) => r.required().error('Elige la técnica'),
    }),
    defineField({
      name: 'destacada',
      title: '⭐ Obra destacada',
      description: 'Las destacadas aparecen primero en la galería y en la portada del sitio.',
      type: 'boolean',
      initialValue: false,
    }),
    // Datos opcionales (escondidos en "Más datos")
    defineField({ name: 'titulo', title: 'Título de la obra', type: 'string', fieldset: 'extra' }),
    defineField({ name: 'edad', title: 'Edad del alumno/a', type: 'number', fieldset: 'extra', validation: (r) => r.integer().min(3).max(110) }),
    defineField({ name: 'nivel', title: 'Grupo', type: 'string', options: { list: NIVELES, layout: 'radio' }, fieldset: 'extra' }),
    defineField({ name: 'instagram', title: 'Publicación de Instagram', type: 'url', fieldset: 'extra', readOnly: true, hidden: ({ value }) => !value }),
  ],
  fieldsets: [
    { name: 'fecha', title: 'Fecha (mes y año)', options: { columns: 2 } },
    { name: 'extra', title: 'Más datos (opcional)', options: { collapsible: true, collapsed: true } },
  ],
  orderings: [
    {
      title: 'Más recientes primero',
      name: 'recientes',
      by: [
        { field: 'anio', direction: 'desc' },
        { field: 'mes', direction: 'desc' },
        { field: '_createdAt', direction: 'desc' },
      ],
    },
  ],
  preview: {
    select: { alumno: 'alumno', titulo: 'titulo', tecnica: 'tecnica', mes: 'mes', anio: 'anio', destacada: 'destacada', media: 'foto' },
    prepare: ({ alumno, titulo, tecnica, mes, anio, destacada, media }) => ({
      title: `${destacada ? '⭐ ' : ''}${titulo || alumno || 'alumno/a del taller'}`,
      subtitle: [nombreTecnica(tecnica), [nombreMes(mes), anio].filter(Boolean).join(' ')].filter(Boolean).join(' · '),
      media,
    }),
  },
})
