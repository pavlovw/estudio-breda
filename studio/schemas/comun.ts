// Listas compartidas entre los formularios del panel.

export const TECNICAS = [
  { title: 'Lápiz grafito', value: 'grafito' },
  { title: 'Lápices de colores', value: 'lapices-colores' },
  { title: 'Cera óleo', value: 'cera-oleo' },
  { title: 'Cera pastel', value: 'cera-pastel' },
  { title: 'Acuarela', value: 'acuarela' },
  { title: 'Acrílico', value: 'acrilico' },
  { title: 'Óleo', value: 'oleo' },
  { title: 'Carboncillo', value: 'carboncillo' },
  { title: 'Plumones de alcohol', value: 'plumones-alcohol' },
  { title: 'Plumones acrílicos', value: 'plumones-acrilico' },
]

export const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
].map((title, i) => ({ title, value: i + 1 }))

export const NIVELES = [
  { title: 'Niños y niñas', value: 'ninos' },
  { title: 'Jóvenes', value: 'jovenes' },
  { title: 'Adultos', value: 'adultos' },
]

export const nombreTecnica = (v?: string) => TECNICAS.find((t) => t.value === v)?.title ?? ''
export const nombreMes = (m?: number) => MESES.find((x) => x.value === m)?.title ?? ''
