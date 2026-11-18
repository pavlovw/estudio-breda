// Condiciones del taller (página /clases). Los textos entre <b>…</b> se destacan.

export const PAGO = {
  titular: 'Estudio de Artes Catalina Paz Vargas Soto E.I.R.L.',
  rut: '78.083.233-9',
  banco: 'Banco de Chile',
  tipo: 'Cuenta corriente',
  numero: '00-196-12044-06',
  whatsapp: '+56 9 4532 3493',
  correo: 'catalinavargassoto@gmail.com',
};

/** Lo esencial en números grandes */
export const ESENCIAL = [
  { numero: '1 al 6', unidad: 'de cada mes', texto: 'plazo para pagar la mensualidad', color: 'var(--petroleo)' },
  { numero: '8 h', unidad: 'antes', texto: 'para avisar si un alumno/a no asistirá', color: 'var(--calabaza)' },
  { numero: '7 días', unidad: 'antes', texto: 'para avisar si no continúa el mes siguiente', color: 'var(--vino)' },
  { numero: 'mismo mes', unidad: '', texto: 'las recuperaciones se hacen dentro del mes, según disponibilidad', color: 'var(--turquesa)' },
];

export type Seccion = {
  id: string;
  titulo: string;
  icono: string; // trazos SVG (viewBox 0 0 24 24)
  color: string;
  tono?: 'aviso';
  items: string[];
};

export const SECCIONES: Seccion[] = [
  {
    id: 'incumplimiento',
    titulo: 'Si el pago se atrasa',
    icono: '<path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17h.01"/>',
    color: 'var(--oxido)',
    tono: 'aviso',
    items: [
      'No pagar dentro del plazo, <b>sin una justificación válida</b>, se considera incumplimiento.',
      'Si al <b>día 6</b> no hay pago ni aviso, el alumno/a <b>puede perder su cupo</b>.',
      'Esta situación se avisa por <b>WhatsApp</b>.',
    ],
  },
  {
    id: 'horarios',
    titulo: 'Horarios y retiro',
    icono: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    color: 'var(--petroleo)',
    items: [
      'El alumno/a debe ser retirado <b>puntualmente</b> al terminar la clase.',
      'Si los atrasos se repiten, se hará un llamado de atención al apoderado.',
      'El retiro lo hace el apoderado <b>dentro del taller</b>.',
      'Si el apoderado autoriza que el alumno/a se retire solo, el taller no se hace responsable desde que sale del recinto.',
      'Esa autorización debe quedar <b>por escrito</b>, por WhatsApp o correo.',
    ],
  },
  {
    id: 'asistencia',
    titulo: 'Inasistencias y recuperaciones',
    icono: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4M9 15l2 2 4-4"/>',
    color: 'var(--turquesa)',
    items: [
      'Avisa siempre la inasistencia con <b>al menos 8 horas</b> de anticipación.',
      'Las recuperaciones se hacen <b>dentro del mismo mes</b>, según disponibilidad.',
      'Si el alumno/a no asiste a su recuperación, <b>se considera clase realizada</b>.',
    ],
  },
  {
    id: 'convivencia',
    titulo: 'Convivencia',
    icono: '<path d="M7 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM17 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/><path d="M2 20c0-3 2.5-5 5-5s5 2 5 5M12 20c0-3 2.5-5 5-5s5 2 5 5"/>',
    color: 'var(--calabaza)',
    items: [
      'Actitud de <b>respeto</b> hacia compañeros/as y profesor/a.',
      'No se permiten conductas agresivas, burlas ni interrupciones constantes.',
      'Buscamos un ambiente de <b>respeto, creatividad y colaboración</b>.',
      'Si hay conductas reiteradas que afecten la clase, se informa al apoderado y se evalúa la continuidad.',
    ],
  },
  {
    id: 'materiales',
    titulo: 'Materiales y orden',
    icono: '<path d="M18 3c-3 3-7 8-8 11l2 2c3-1 8-5 11-8"/><path d="M10 14c-3 0-4 2-4 4s-1 3-3 3c4 1 8 0 9-3"/>',
    color: 'var(--primario)',
    items: [
      'Cuidamos los materiales que entrega el taller.',
      'Cada uno mantiene <b>limpio y ordenado</b> su espacio.',
      'Al terminar, todos ayudan a ordenar.',
      'Si hay <b>daño intencional</b> a materiales o al espacio, el apoderado asume los costos.',
    ],
  },
  {
    id: 'responsabilidad',
    titulo: 'Qué traer',
    icono: '<path d="M6 7h12l-1 13H7z"/><path d="M9 7a3 3 0 0 1 6 0"/>',
    color: 'var(--vino)',
    items: [
      'Los materiales solicitados, <b>si corresponde</b>.',
      'Se recomienda <b>ropa que se pueda manchar</b>.',
      'El taller no se hace responsable por daños en ropa u objetos personales.',
    ],
  },
  {
    id: 'retiro',
    titulo: 'Si dejas el taller',
    icono: '<path d="M14 4h5v16h-5"/><path d="M10 12H3M6 8l-4 4 4 4"/>',
    color: 'var(--noche)',
    items: [
      'Para no continuar el mes siguiente, avisa con <b>al menos 7 días</b> de anticipación.',
      'Si te retiras a mitad de mes, avisa dentro del mes en curso. <b>No se devuelven</b> pagos ya hechos.',
    ],
  },
];

/** Casos en que sí se recupera una clase */
export const RECUPERABLES = ['Enfermedad (con certificado médico)', 'Emergencia justificada', 'Suspensión por parte del taller'];
