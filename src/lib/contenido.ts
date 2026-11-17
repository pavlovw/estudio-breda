// Capa de acceso a contenido: todos los componentes piden los datos aquí.
//
// Por defecto lee desde Sanity (lo que tu hermana edita en el panel).
// Con CONTENIDO=local usa los archivos JSON de src/data (útil sin internet).
import sitioLocal from '../data/sitio.json';
import obrasLocal from '../data/obras.json';
import fotosExposLocal from '../data/exposiciones-fotos.json';
import { cargarDeSanity, imagen } from './sanity';

export type Sitio = typeof sitioLocal & { heroObras?: string[]; quienesObras?: string[] };
export type Obra = {
  id: string;
  titulo: string;
  alumno: string;
  edad: number | null;
  nivel: string;
  tecnica: string;
  fecha: string;
  anio: number;
  destacada: boolean;
  ancho: number;
  alto: number;
  anchoMini: number;
  color: string;
  imagen: string;
  miniatura: string;
  instagram: string;
};
export type FotoExpo = { imagen: string; miniatura: string; ancho: number; alto: number; anchoMini: number };
export type VideoExpo = { src: string; poster: string; ancho: number; alto: number };
export type Exposicion = {
  id: string;
  numero: string;
  nombre: string;
  fecha: string;
  fechaTexto: string;
  descripcion: string;
  video: VideoExpo | null;
  fotos: FotoExpo[];
};

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

/** "2026-03-28" -> "Sábado 28 de marzo de 2026" */
function fechaLarga(iso: string): string {
  const d = new Date(iso + 'T12:00:00');
  const t = d.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).replace(',', '');
  return t.charAt(0).toUpperCase() + t.slice(1);
}
const slug = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

// ---------- Carga ----------
type Datos = { sitio: Sitio; obras: Obra[]; exposiciones: Exposicion[] };

function cargarLocal(): Datos {
  const media = fotosExposLocal as Record<string, { video: VideoExpo | null; fotos: FotoExpo[] }>;
  return {
    sitio: sitioLocal,
    obras: obrasLocal as Obra[],
    exposiciones: sitioLocal.exposiciones.lista.map((e) => ({ ...e, video: media[e.id]?.video ?? null, fotos: media[e.id]?.fotos ?? [] })),
  };
}

async function cargarSanity(): Promise<Datos> {
  const r = await cargarDeSanity();
  if (!r.sitio) throw new Error('Sanity no tiene el documento "Textos del sitio" publicado.');

  const obras: Obra[] = r.obras.map((o) => {
    const grande = imagen(o.foto, 1080);
    const mini = imagen(o.foto, 560);
    return {
      id: o._id,
      titulo: o.titulo ?? '',
      alumno: o.alumno ?? '',
      edad: o.edad ?? null,
      nivel: o.nivel ?? '',
      tecnica: o.tecnica,
      fecha: `${o.anio}-${String(o.mes).padStart(2, '0')}`,
      anio: o.anio,
      destacada: Boolean(o.destacada),
      ancho: grande.ancho,
      alto: grande.alto,
      anchoMini: mini.ancho,
      color: o.foto.asset?.metadata?.palette?.dominant?.background ?? '#e9d8a6',
      imagen: grande.url,
      miniatura: mini.url,
      instagram: o.instagram ?? '',
    };
  });
  // Destacadas primero, luego las más recientes (orden estable)
  obras.sort((a, b) => Number(b.destacada) - Number(a.destacada));

  const exposiciones: Exposicion[] = r.exposiciones.map((e) => {
    const fotos = (e.fotos ?? []).filter((f) => f.asset).map((f) => {
      const g = imagen(f, 1400);
      const m = imagen(f, 600);
      return { imagen: g.url, miniatura: m.url, ancho: g.ancho, alto: g.alto, anchoMini: m.ancho };
    });
    const src = e.videoUrl || e.videoRuta || '';
    const portada = e.portadaVideo?.asset ? imagen(e.portadaVideo, 1080) : null;
    return {
      id: slug(e.numero || e._id),
      numero: e.numero ?? '',
      nombre: e.nombre ?? '',
      fecha: e.fecha ?? '',
      fechaTexto: e.fecha ? fechaLarga(e.fecha) : '',
      descripcion: e.descripcion ?? '',
      video: src ? { src, poster: portada?.url ?? fotos[0]?.imagen ?? '', ancho: portada?.ancho ?? 16, alto: portada?.alto ?? 9 } : null,
      fotos,
    };
  });

  const sitio = { ...sitioLocal, ...r.sitio, exposiciones: { ...sitioLocal.exposiciones, ...r.sitio.exposiciones, lista: [] } } as Sitio;
  return { sitio, obras, exposiciones };
}

const datos: Datos = process.env.CONTENIDO === 'local' ? cargarLocal() : await cargarSanity();

// ---------- API para los componentes ----------
export function getSitio(): Sitio {
  return datos.sitio;
}
export function getObras(): Obra[] {
  return datos.obras;
}
export function getExposiciones(): Exposicion[] {
  return datos.exposiciones;
}
export function getDestacadas(): Obra[] {
  return datos.obras.filter((o) => o.destacada);
}

const porIds = (ids?: string[]) => (ids ?? []).map((id) => datos.obras.find((o) => o.id === id)).filter(Boolean) as Obra[];
const reserva = () => (getDestacadas().length ? getDestacadas() : datos.obras);

/** Obras del collage de la portada (elegidas en el panel o, si no, destacadas). */
export function getObrasPortada(): Obra[] {
  const elegidas = porIds(datos.sitio.heroObras);
  return elegidas.length ? elegidas : reserva().slice(0, 3);
}
/** Obras de "Quiénes somos" (elegidas en el panel o, si no, otras destacadas). */
export function getObrasQuienes(): Obra[] {
  const elegidas = porIds(datos.sitio.quienesObras);
  if (elegidas.length) return elegidas;
  const r = reserva();
  return (r.length > 5 ? r.slice(3, 5) : r.slice(-2)).filter(Boolean);
}

export const NIVELES: Record<string, string> = {
  ninos: 'Niños',
  jovenes: 'Jóvenes',
  adultos: 'Adultos',
};

export function nombreTecnica(id: string): string {
  return datos.sitio.tecnicas.lista.find((t) => t.id === id)?.nombre ?? id;
}

/** Título a mostrar: el de la obra o, si no tiene, la técnica. */
export function tituloObra(o: Obra): string {
  return o.titulo || nombreTecnica(o.tecnica);
}

/** Autor a mostrar: "Sofía, 9 años", "Sofía" o un texto genérico. */
export function autorObra(o: Obra): string {
  if (!o.alumno) return 'alumno/a del taller';
  return o.edad ? `${o.alumno}, ${o.edad} años` : o.alumno;
}

/** "2024-07" -> "julio 2024" */
export function fechaObra(o: Obra): string {
  const [a, m] = o.fecha.split('-').map(Number);
  return m ? `${MESES[m - 1]} ${a}` : String(o.anio);
}

export function formatoPrecio(valor: number, moneda = 'CLP'): string {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: moneda, maximumFractionDigits: 0 }).format(valor);
}
