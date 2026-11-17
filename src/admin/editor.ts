// Modo edición del sitio.
//
// Solo se descarga cuando alguien inició sesión en /admin (ver Base.astro).
// Muestra el sitio tal cual lo ven los visitantes, más:
//   - una barra abajo: Editar sí/no, + Obra, + Exposición, Salir y el estado de publicación
//   - textos con borde punteado: al tocarlos se abre un formulario para cambiarlos
//   - botones para editar o borrar cada obra y para agregar o quitar fotos de exposiciones
// Todo se guarda a través de /api/* (funciones de Netlify) en Sanity. El sitio
// público se vuelve a publicar solo en ~1 minuto.
// Los estilos van dentro de este archivo (no como hoja aparte) para que los visitantes no los descarguen
import estilos from './editor.css?inline';
document.head.insertAdjacentHTML('beforeend', `<style>${estilos}</style>`);

// ---------------------------------------------------------------- tipos
type Tipo = 'linea' | 'parrafo' | 'parrafos' | 'lineas' | 'precio' | 'url';
type ObraVivo = {
  id: string;
  titulo?: string;
  alumno?: string;
  edad?: number;
  nivel?: string;
  tecnica: string;
  mes: number;
  anio: number;
  destacada?: boolean;
  miniatura?: string;
  imagen?: string;
};
type ExpoVivo = { id: string; nombre: string; numero: string; fecha: string; descripcion?: string; fotos: { clave: string; miniatura: string }[] };
type Contenido = { sitio: any; obras: ObraVivo[]; exposiciones: ExpoVivo[] };

// ---------------------------------------------------------------- utilidades
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const NIVELES: Record<string, string> = { ninos: 'Niños', jovenes: 'Jóvenes', adultos: 'Adultos' };
const TECNICAS_RESERVA: Record<string, string> = {
  grafito: 'Grafito',
  'lapices-colores': 'Lápices de colores',
  'cera-oleo': 'Cera óleo',
  'cera-pastel': 'Cera pastel',
  acuarela: 'Acuarela',
  acrilico: 'Acrílico',
  oleo: 'Óleo',
};
const SECCIONES: Record<string, string> = {
  hero: 'Portada',
  quienesSomos: 'Quiénes somos',
  tecnicas: 'Técnicas',
  clases: 'Clases',
  galeria: 'Galería',
  exposiciones: 'Exposiciones',
  contacto: 'Contacto',
};

const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const $ = <T extends Element = HTMLElement>(sel: string, raiz: ParentNode = document) => raiz.querySelector<T>(sel);
const $$ = <T extends Element = HTMLElement>(sel: string, raiz: ParentNode = document) => [...raiz.querySelectorAll<T>(sel)];
const partes = (ruta: string) => ruta.replace(/\[(\d+)\]/g, '.$1').split('.');
const leer = (obj: any, ruta: string) => partes(ruta).reduce((o, k) => (o == null ? undefined : o[k]), obj);
function escribir(obj: any, ruta: string, valor: unknown) {
  const p = partes(ruta);
  let o = obj;
  for (const k of p.slice(0, -1)) o = o[k] ??= {};
  o[p.at(-1)!] = valor;
}
const precioTexto = (n: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n);
function fechaLarga(iso: string) {
  const t = new Date(iso + 'T12:00:00').toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).replace(',', '');
  return t.charAt(0).toUpperCase() + t.slice(1);
}
const guardarLocal = (k: string, v: string | null) => {
  try {
    v === null ? localStorage.removeItem(k) : localStorage.setItem(k, v);
  } catch {}
};
const leerLocal = (k: string) => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};

// ---------------------------------------------------------------- API
class ErrorApi extends Error {
  status: number;
  constructor(m: string, status: number) {
    super(m);
    this.status = status;
  }
}

/** Anota el momento (hora del servidor) del último cambio, para saber cuándo queda publicado. */
function registrarCambio(fechaServidor: string | null) {
  const t = fechaServidor ? Date.parse(fechaServidor) : Date.now();
  const previo = Number(leerLocal('breda-cambio') || 0);
  guardarLocal('breda-cambio', String(Math.max(previo, t || Date.now())));
  vigilarPublicacion();
}

async function api<T = any>(url: string, metodo = 'GET', cuerpo?: unknown): Promise<T> {
  const init: RequestInit = { method: metodo, credentials: 'same-origin', headers: {} };
  if (cuerpo instanceof FormData) init.body = cuerpo;
  else if (cuerpo !== undefined) {
    init.body = JSON.stringify(cuerpo);
    (init.headers as Record<string, string>)['content-type'] = 'application/json';
  }
  let r: Response;
  try {
    r = await fetch(url, init);
  } catch {
    throw new ErrorApi('Sin conexión a internet. Revisa tu señal e intenta de nuevo.', 0);
  }
  const d = await r.json().catch(() => ({}));
  if (!r.ok || !d.ok) throw new ErrorApi(d.error || `Ocurrió un error (${r.status})`, r.status);
  if (metodo !== 'GET') registrarCambio(r.headers.get('date'));
  return d;
}

/** Igual que api() pero con barra de progreso (para subir fotos). */
function enviarConProgreso(url: string, metodo: string, fd: FormData, alProgreso: (p: number) => void): Promise<any> {
  return new Promise((resolve, reject) => {
    const x = new XMLHttpRequest();
    x.open(metodo, url);
    x.withCredentials = true;
    x.upload.onprogress = (e) => e.lengthComputable && alProgreso(e.loaded / e.total);
    x.onerror = () => reject(new ErrorApi('Sin conexión a internet. Revisa tu señal e intenta de nuevo.', 0));
    x.onload = () => {
      let d: any = {};
      try {
        d = JSON.parse(x.responseText);
      } catch {}
      if (x.status >= 400 || !d.ok) {
        const msg = x.status === 413 ? 'La foto es demasiado pesada.' : d.error || `Ocurrió un error (${x.status})`;
        return reject(new ErrorApi(msg, x.status));
      }
      registrarCambio(x.getResponseHeader('date'));
      resolve(d);
    };
    x.send(fd);
  });
}

let contenidoPromesa: Promise<Contenido> | null = null;
const contenido = () => (contenidoPromesa ??= api<Contenido>('/api/contenido').catch((e) => ((contenidoPromesa = null), Promise.reject(e))));

const nombreTecnica = (c: Contenido | null, id: string) =>
  c?.sitio?.tecnicas?.lista?.find((t: any) => t.id === id)?.nombre ?? TECNICAS_RESERVA[id] ?? id;
const autorObra = (o: ObraVivo) => (!o.alumno ? 'alumno/a del taller' : o.edad ? `${o.alumno}, ${o.edad} años` : o.alumno);
const fechaObra = (o: ObraVivo) => `${MESES[o.mes - 1]} ${o.anio}`;

// ---------------------------------------------------------------- fotos
/** Achica y comprime la foto en el celular antes de subirla (las fotos de cámara pesan mucho). */
async function comprimir(archivo: File): Promise<{ blob: Blob; ancho: number; alto: number }> {
  const MAX_LADO = 2200;
  const LIMITE = 3.2 * 1024 * 1024;
  const url = URL.createObjectURL(archivo);
  try {
    // (img.decode() a veces nunca termina en páginas con muchas imágenes: se usa onload)
    const img = new Image();
    await new Promise<void>((ok, falla) => {
      img.onload = () => ok();
      img.onerror = () => falla(new Error('No se pudo leer esa foto. Prueba con otra o sácale una captura de pantalla.'));
      img.src = url;
    });
    const esc = Math.min(1, MAX_LADO / Math.max(img.naturalWidth, img.naturalHeight));
    const ancho = Math.round(img.naturalWidth * esc);
    const alto = Math.round(img.naturalHeight * esc);
    const lienzo = document.createElement('canvas');
    lienzo.width = ancho;
    lienzo.height = alto;
    const ctx = lienzo.getContext('2d')!;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, ancho, alto);
    ctx.drawImage(img, 0, 0, ancho, alto);
    let blob: Blob | null = null;
    for (const q of [0.86, 0.78, 0.7, 0.6, 0.5]) {
      blob = await new Promise<Blob | null>((r) => lienzo.toBlob(r, 'image/jpeg', q));
      if (blob && blob.size <= LIMITE) break;
    }
    if (!blob) throw new Error('No se pudo preparar la foto.');
    return { blob, ancho, alto };
  } finally {
    URL.revokeObjectURL(url);
  }
}

// ---------------------------------------------------------------- avisos
let pilaAvisos: HTMLElement;
function avisar(mensaje: string, tipo: 'ok' | 'error' | 'info' = 'ok', accion?: { texto: string; fn: () => void }, ms = 5000) {
  const a = document.createElement('div');
  a.className = `ed-aviso ed-aviso--${tipo}`;
  a.setAttribute('role', tipo === 'error' ? 'alert' : 'status');
  a.innerHTML = `<span>${esc(mensaje)}</span>`;
  if (accion) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = accion.texto;
    b.onclick = () => {
      a.remove();
      accion.fn();
    };
    a.append(b);
  }
  pilaAvisos.append(a);
  const quitar = () => {
    a.classList.add('ed-aviso--sale');
    setTimeout(() => a.remove(), 300);
  };
  if (ms) setTimeout(quitar, ms);
  a.addEventListener('click', (e) => e.target === a && quitar());
  return { quitar, texto: (t: string) => (a.querySelector('span')!.textContent = t) };
}

// ---------------------------------------------------------------- diálogo
let dialogo: HTMLDialogElement;

/**
 * Abre el diálogo con un formulario. `guardar` recibe el formulario; si lanza
 * un error, se muestra arriba del botón y el diálogo sigue abierto.
 */
function abrirDialogo(op: {
  titulo: string;
  cuerpo: string;
  textoGuardar?: string;
  extra?: string;
  alAbrir?: (f: HTMLFormElement) => void;
  guardar: (f: HTMLFormElement, boton: HTMLButtonElement) => Promise<void | false>;
}) {
  dialogo.innerHTML = `
    <form class="ed-form" novalidate>
      <header class="ed-form__cabecera">
        <h2>${esc(op.titulo)}</h2>
        <button type="button" class="ed-cerrar" aria-label="Cerrar">✕</button>
      </header>
      <div class="ed-form__cuerpo">${op.cuerpo}</div>
      <p class="ed-form__error" role="alert" hidden></p>
      <footer class="ed-form__pie">
        ${op.extra ?? ''}
        <button type="submit" class="boton ed-guardar">${esc(op.textoGuardar ?? 'Guardar')}</button>
      </footer>
    </form>`;
  const f = $<HTMLFormElement>('form', dialogo)!;
  const errorEl = $('.ed-form__error', f)!;
  const boton = $<HTMLButtonElement>('.ed-guardar', f)!;
  $('.ed-cerrar', f)!.onclick = () => dialogo.close();
  f.onsubmit = async (e) => {
    e.preventDefault();
    errorEl.hidden = true;
    const textoBoton = boton.textContent;
    boton.disabled = true;
    boton.textContent = 'Guardando…';
    try {
      const r = await op.guardar(f, boton);
      if (r !== false) dialogo.close();
    } catch (err) {
      errorEl.textContent = (err as Error).message;
      errorEl.hidden = false;
      errorEl.scrollIntoView({ block: 'nearest' });
      if ((err as ErrorApi).status === 401) sesionVencida();
    } finally {
      boton.disabled = false;
      boton.textContent = textoBoton;
    }
  };
  op.alAbrir?.(f);
  if (!dialogo.open) dialogo.showModal();
  document.body.classList.add('ed-con-dialogo');
  return f;
}

function cargandoDialogo(titulo: string) {
  dialogo.innerHTML = `<div class="ed-form"><header class="ed-form__cabecera"><h2>${esc(titulo)}</h2></header><p class="ed-cargando">Cargando…</p></div>`;
  if (!dialogo.open) dialogo.showModal();
  document.body.classList.add('ed-con-dialogo');
}

// ---------------------------------------------------------------- textos del sitio
const CAMPOS: Record<string, [string, Tipo]> = {
  'hero.antetitulo': ['Frase manuscrita sobre el título', 'linea'],
  'hero.titulo': ['Título grande', 'linea'],
  'hero.palabraDestacada': ['Palabra pintada en color (debe ser una palabra del título)', 'linea'],
  'hero.bajada': ['Texto bajo el título', 'parrafo'],
  'hero.botonPrincipal': ['Texto del botón', 'linea'],
  'hero.botonSecundario': ['Texto del botón', 'linea'],
  'quienesSomos.parrafos': ['Párrafos (deja una línea en blanco entre cada párrafo)', 'parrafos'],
  'clases.plan.nombre': ['Nombre del plan', 'linea'],
  'clases.plan.precio': ['Precio mensual en pesos (solo números)', 'precio'],
  'clases.plan.periodo': ['Texto junto al precio (ej: "al mes")', 'linea'],
  'clases.plan.detalle': ['Detalle (ej: "2 clases a la semana")', 'linea'],
  'clases.plan.incluye': ['Qué incluye (una cosa por línea)', 'lineas'],
  'clases.plan.boton': ['Texto del botón', 'linea'],
  whatsapp: ['Enlace de WhatsApp (ej: https://wa.me/56912345678)', 'url'],
  instagram: ['Enlace de Instagram', 'url'],
  instagramUsuario: ['Usuario de Instagram (ej: @estudiobreda_arte)', 'linea'],
  'contacto.botonWhatsapp': ['Texto del botón de WhatsApp', 'linea'],
  'contacto.botonInstagram': ['Texto del botón de Instagram', 'linea'],
};
function campoDe(ruta: string): [string, Tipo] {
  if (CAMPOS[ruta]) return CAMPOS[ruta];
  const ult = ruta.split('.').at(-1)!;
  if (ult === 'titulo') return ['Título de la sección', 'linea'];
  if (ult === 'nota') return ['Nota manuscrita (la frase chica en cursiva)', 'linea'];
  if (ult === 'bajada' || ult === 'texto') return ['Texto', 'parrafo'];
  if (ult.startsWith('boton')) return ['Texto del botón', 'linea'];
  return [ult, 'linea'];
}
const ITEMS: Record<string, { nombre: string; campos: [string, string, Tipo][] }> = {
  'quienesSomos.cifras': {
    nombre: 'Cifra',
    campos: [
      ['valor', 'Número (ej: 8+ o 120)', 'linea'],
      ['texto', 'Texto bajo el número', 'linea'],
    ],
  },
  'tecnicas.lista': {
    nombre: 'Técnica',
    campos: [
      ['nombre', 'Nombre', 'linea'],
      ['descripcion', 'Descripción', 'parrafo'],
    ],
  },
  'clases.niveles': {
    nombre: 'Grupo',
    campos: [
      ['nombre', 'Nombre', 'linea'],
      ['descripcion', 'Descripción', 'parrafo'],
    ],
  },
};

function inputHTML(nombre: string, etiqueta: string, tipo: Tipo, valor: unknown) {
  let v = valor ?? '';
  if (tipo === 'parrafos') v = (valor as string[] | undefined)?.join('\n\n') ?? '';
  if (tipo === 'lineas') v = (valor as string[] | undefined)?.join('\n') ?? '';
  const largo = tipo === 'linea' ? 160 : tipo === 'url' ? 300 : tipo === 'parrafo' ? 1200 : 6000;
  const control =
    tipo === 'linea' || tipo === 'url' || tipo === 'precio'
      ? `<input name="${esc(nombre)}" value="${esc(v)}" maxlength="${largo}" ${tipo === 'precio' ? 'inputmode="numeric" pattern="[0-9.]*"' : ''} ${tipo === 'url' ? 'type="url" inputmode="url"' : 'type="text"'} />`
      : `<textarea name="${esc(nombre)}" rows="${tipo === 'parrafo' ? 4 : 7}" maxlength="${largo}">${esc(v)}</textarea>`;
  return `<label class="ed-campo"><span>${esc(etiqueta)}</span>${control}</label>`;
}

function leerCampo(f: HTMLFormElement, nombre: string, tipo: Tipo, etiqueta: string): unknown {
  const v = String(new FormData(f).get(nombre) ?? '').trim();
  if (tipo === 'precio') {
    const n = Number(v.replace(/[.\s$]/g, ''));
    if (!Number.isInteger(n) || n < 0) throw new Error('El precio debe ser un número, por ejemplo 27000');
    return n;
  }
  if (tipo === 'url' && v && !/^https:\/\/\S+$/.test(v)) throw new Error(`"${etiqueta}" debe empezar con https://`);
  if (tipo === 'parrafos') return v.split(/\n\s*\n/).map((x) => x.trim()).filter(Boolean);
  if (tipo === 'lineas') return v.split('\n').map((x) => x.trim()).filter(Boolean);
  return v;
}

async function editarTextos(rutas: string[]) {
  const titulo = SECCIONES[rutas[0].split('.')[0]] ?? 'Editar';
  cargandoDialogo(titulo);
  const c = await contenido();
  const s = c.sitio;
  const campos: { nombre: string; etiqueta: string; tipo: Tipo; ruta: string; base?: string; indice?: number; campo?: string }[] = [];
  let tituloDialogo = titulo;
  for (const ruta of rutas) {
    const m = ruta.match(/^(.+)\[(\d+)\]$/);
    if (m && ITEMS[m[1]]) {
      const [, base, i] = m;
      tituloDialogo = `${titulo} · ${ITEMS[base].nombre}`;
      for (const [campo, etiqueta, tipo] of ITEMS[base].campos)
        campos.push({ nombre: `${ruta}.${campo}`, etiqueta, tipo, ruta, base, indice: Number(i), campo });
    } else {
      const [etiqueta, tipo] = campoDe(ruta);
      campos.push({ nombre: ruta, etiqueta, tipo, ruta });
    }
  }
  const nota = rutas.includes('whatsapp') || rutas.includes('instagram') ? '<p class="ed-nota">El enlace se usa en todos los botones del sitio que llevan ahí.</p>' : '';
  abrirDialogo({
    titulo: tituloDialogo,
    cuerpo: campos.map((k) => inputHTML(k.nombre, k.etiqueta, k.tipo, leer(s, k.nombre))).join('') + nota,
    alAbrir: (f) => $<HTMLInputElement>('input, textarea', f)?.focus(),
    guardar: async (f) => {
      const cambios: Record<string, unknown> = {};
      for (const k of campos) {
        const v = leerCampo(f, k.nombre, k.tipo, k.etiqueta);
        if (k.base !== undefined) {
          const lista = (cambios[k.base] as any[]) ?? structuredClone(leer(s, k.base) ?? []);
          lista[k.indice!] = { ...lista[k.indice!], [k.campo!]: v };
          cambios[k.base] = lista;
        } else cambios[k.ruta] = v;
      }
      if ('hero.palabraDestacada' in cambios) {
        const p = String(cambios['hero.palabraDestacada']).toLowerCase();
        const palabras = String(cambios['hero.titulo'] ?? s.hero.titulo).toLowerCase().split(/\s+/);
        if (p && !palabras.includes(p)) throw new Error('La palabra pintada debe ser exactamente una de las palabras del título');
        cambios['hero.palabraDestacada'] = p;
      }
      for (const [k, v] of Object.entries(cambios)) if (v === '' && !k.includes('nota')) throw new Error('No dejes campos vacíos');
      await api('/api/sitio', 'PATCH', { cambios });
      for (const [k, v] of Object.entries(cambios)) escribir(s, k, v);
      refrescarTextos(Object.keys(cambios), s);
      avisar('¡Guardado! El sitio se actualiza en ~1 minuto.');
    },
  });
}

/** Pone los textos nuevos en la página que se está viendo. */
function refrescarTextos(rutas: string[], s: any) {
  let faltan = false;
  for (const ruta of rutas) {
    const valor = leer(s, ruta);
    if (Array.isArray(valor)) {
      const elems = $$(`[data-valor^="${ruta}["]`);
      if (elems.length && valor.length !== elems.filter((e) => /\[\d+\]$/.test(e.dataset.valor!)).length && typeof valor[0] === 'string') faltan = true;
    }
    for (const el of $$(`[data-valor="${ruta}"], [data-valor^="${ruta}["]`)) {
      const v = leer(s, el.dataset.valor!);
      if (v === undefined || typeof v === 'object') continue;
      el.textContent = el.dataset.formato === 'precio' ? precioTexto(Number(v)) : String(v);
    }
  }
  if (faltan) avisar('Cambió la cantidad de elementos: se verá completo cuando termine de publicarse.', 'info');
}

// ---------------------------------------------------------------- obras elegidas (portada y quiénes somos)
async function elegirObras(ruta: 'hero.obras' | 'quienesSomos.obras') {
  const max = ruta === 'hero.obras' ? 3 : 2;
  const donde = ruta === 'hero.obras' ? 'la portada' : '"Quiénes somos"';
  cargandoDialogo(`Fotos de ${donde}`);
  const c = await contenido();
  const clave = ruta === 'hero.obras' ? 'heroObras' : 'quienesObras';
  const elegidas: string[] = [...(c.sitio[clave] ?? [])];
  abrirDialogo({
    titulo: `Fotos de ${donde}`,
    cuerpo: `
      <p class="ed-nota">Elige hasta ${max} obras. Si no eliges ninguna, se usan las destacadas.</p>
      <p class="ed-conteo" aria-live="polite"></p>
      <ul class="ed-elegir">
        ${c.obras
          .map(
            (o) => `<li><label><input type="checkbox" value="${esc(o.id)}" ${elegidas.includes(o.id) ? 'checked' : ''}/>
              <img src="${esc(o.miniatura)}" alt="" loading="lazy" width="160" height="160"/><span>${esc(nombreTecnica(c, o.tecnica))}</span></label></li>`,
          )
          .join('')}
      </ul>`,
    alAbrir: (f) => {
      const conteo = $('.ed-conteo', f)!;
      const marcar = () => {
        const n = elegidas.length;
        conteo.textContent = `${n} de ${max} elegidas`;
        $$<HTMLInputElement>('.ed-elegir input', f).forEach((i) => (i.disabled = !i.checked && n >= max));
        $$<HTMLInputElement>('.ed-elegir input', f).forEach((i) => {
          const pos = elegidas.indexOf(i.value);
          i.closest('label')!.dataset.orden = pos >= 0 ? String(pos + 1) : '';
        });
      };
      f.addEventListener('change', (e) => {
        const i = e.target as HTMLInputElement;
        if (i.checked) elegidas.push(i.value);
        else elegidas.splice(elegidas.indexOf(i.value), 1);
        marcar();
      });
      marcar();
    },
    guardar: async () => {
      await api('/api/sitio', 'PATCH', { cambios: { [ruta]: elegidas } });
      c.sitio[clave] = [...elegidas];
      const imgs = $$<HTMLImageElement>(`[data-editar="${ruta}"] img`);
      elegidas.forEach((id, i) => {
        const o = c.obras.find((x) => x.id === id);
        if (!o || !imgs[i]) return;
        imgs[i].removeAttribute('srcset');
        imgs[i].src = o.imagen ?? o.miniatura ?? '';
        const cap = imgs[i].closest('figure')?.querySelector('figcaption');
        if (cap) cap.textContent = nombreTecnica(c, o.tecnica);
      });
      avisar('¡Guardado! El sitio se actualiza en ~1 minuto.');
    },
  });
}

// ---------------------------------------------------------------- obras
function formularioObra(c: Contenido | null, o?: ObraVivo) {
  const hoy = new Date();
  const mes = o?.mes ?? hoy.getMonth() + 1;
  const anio = o?.anio ?? hoy.getFullYear();
  const anios = Array.from({ length: hoy.getFullYear() - 2014 + 1 }, (_, i) => hoy.getFullYear() + 1 - i);
  const tecnicas: { id: string; nombre: string }[] =
    c?.sitio?.tecnicas?.lista?.map((t: any) => ({ id: t.id, nombre: t.nombre })) ?? Object.entries(TECNICAS_RESERVA).map(([id, nombre]) => ({ id, nombre }));
  const abrirDetalles = Boolean(o?.titulo || o?.edad || o?.nivel);
  return `
    <div class="ed-foto">
      <div class="ed-foto__vista" ${o?.miniatura ? '' : 'hidden'}>
        <img alt="Vista previa" src="${esc(o?.imagen ?? o?.miniatura ?? '')}" />
      </div>
      <div class="ed-foto__botones">
        <label class="boton boton--turquesa ed-foto__boton">
          📷 Tomar foto
          <input type="file" accept="image/*" capture="environment" name="camara" hidden />
        </label>
        <label class="boton boton--claro ed-foto__boton">
          🖼️ ${o ? 'Cambiar foto' : 'Elegir de la galería'}
          <input type="file" accept="image/*" name="galeria" hidden />
        </label>
      </div>
      <p class="ed-foto__info" hidden></p>
    </div>

    <label class="ed-campo"><span>Nombre del alumno o alumna <small>(opcional)</small></span>
      <input type="text" name="alumno" maxlength="80" value="${esc(o?.alumno)}" placeholder="Si lo dejas vacío dirá «alumno/a del taller»" autocomplete="off" />
    </label>

    <div class="ed-fila">
      <label class="ed-campo"><span>Mes</span>
        <select name="mes">${MESES.map((m, i) => `<option value="${i + 1}" ${i + 1 === mes ? 'selected' : ''}>${m}</option>`).join('')}</select>
      </label>
      <label class="ed-campo"><span>Año</span>
        <select name="anio">${anios.map((a) => `<option ${a === anio ? 'selected' : ''}>${a}</option>`).join('')}</select>
      </label>
    </div>

    <fieldset class="ed-campo ed-tecnicas"><legend>Técnica</legend>
      ${tecnicas
        .map(
          (t) =>
            `<label class="ed-chip"><input type="radio" name="tecnica" value="${esc(t.id)}" ${o?.tecnica === t.id ? 'checked' : ''} required /><span>${esc(t.nombre)}</span></label>`,
        )
        .join('')}
    </fieldset>

    <label class="ed-check"><input type="checkbox" name="destacada" ${o?.destacada ? 'checked' : ''} /> <span>★ Destacada (aparece primero en la galería)</span></label>

    <details class="ed-mas" ${abrirDetalles ? 'open' : ''}>
      <summary>Más detalles (opcional)</summary>
      <label class="ed-campo"><span>Título de la obra</span><input type="text" name="titulo" maxlength="120" value="${esc(o?.titulo)}" placeholder="Si no tiene, se muestra la técnica" /></label>
      <div class="ed-fila">
        <label class="ed-campo"><span>Edad</span><input type="number" name="edad" min="3" max="110" inputmode="numeric" value="${esc(o?.edad)}" /></label>
        <label class="ed-campo"><span>Grupo</span>
          <select name="nivel"><option value="">—</option>${Object.entries(NIVELES).map(([id, n]) => `<option value="${id}" ${o?.nivel === id ? 'selected' : ''}>${n}</option>`).join('')}</select>
        </label>
      </div>
    </details>
    <div class="ed-progreso" hidden><span></span></div>`;
}

/** Conecta los botones de cámara/galería del formulario con la vista previa y la compresión. */
function prepararFoto(f: HTMLFormElement) {
  const estado: { foto: { blob: Blob; ancho: number; alto: number } | null; url: string } = { foto: null, url: '' };
  const vista = $('.ed-foto__vista', f)!;
  const img = $<HTMLImageElement>('img', vista)!;
  const info = $('.ed-foto__info', f)!;
  f.addEventListener('change', async (e) => {
    const input = e.target as HTMLInputElement;
    if (input.type !== 'file' || !input.files?.[0]) return;
    info.hidden = false;
    info.textContent = 'Preparando la foto…';
    try {
      estado.foto = await comprimir(input.files[0]);
      URL.revokeObjectURL(estado.url);
      estado.url = URL.createObjectURL(estado.foto.blob);
      img.src = estado.url;
      vista.hidden = false;
      info.textContent = `Lista (${(estado.foto.blob.size / 1024 / 1024).toFixed(1)} MB)`;
    } catch (err) {
      info.textContent = (err as Error).message;
    }
    input.value = '';
  });
  return estado;
}

function datosObra(f: HTMLFormElement) {
  const fd = new FormData(f);
  const tecnica = fd.get('tecnica');
  if (!tecnica) throw new Error('Elige la técnica');
  const salida = new FormData();
  for (const k of ['alumno', 'mes', 'anio', 'tecnica', 'titulo', 'edad', 'nivel']) salida.set(k, String(fd.get(k) ?? '').trim());
  salida.set('destacada', fd.get('destacada') ? 'true' : 'false');
  return salida;
}

function progreso(f: HTMLFormElement) {
  const caja = $('.ed-progreso', f)!;
  const barra = $('span', caja)!;
  return (p: number | null) => {
    caja.hidden = p === null;
    barra.style.width = `${Math.round((p ?? 0) * 100)}%`;
  };
}

function vistaObra(c: Contenido | null, o: ObraVivo) {
  const tec = nombreTecnica(c, o.tecnica);
  return {
    titulo: o.titulo || tec,
    autor: autorObra(o),
    tecnica: o.titulo ? `${tec} · ${fechaObra(o)}` : fechaObra(o),
    datos: [o.titulo ? tec : '', NIVELES[o.nivel ?? ''] ?? '', fechaObra(o)].filter(Boolean).join(' · '),
  };
}

/** Actualiza (o crea, copiando otra) la tarjeta de la obra en la galería que se está viendo. */
function pintarObra(c: Contenido | null, o: ObraVivo, foto?: { url: string; ancho: number; alto: number }) {
  let li = $<HTMLElement>(`.obra[data-id="${CSS.escape(o.id)}"]`);
  if (!li) {
    const muro = $('.muro');
    const modelo = $<HTMLElement>('.obra', muro ?? document);
    if (!muro || !modelo) return;
    li = modelo.cloneNode(true) as HTMLElement;
    li.dataset.id = o.id;
    li.querySelector('.ed-acciones')?.remove();
    li.classList.add('visible', 'colgada', 'ed-nueva');
    li.hidden = false;
    muro.prepend(li);
    agregarAccionesObra(li);
  }
  const v = vistaObra(c, o);
  li.dataset.tecnica = o.tecnica;
  li.dataset.nivel = o.nivel ?? '';
  li.dataset.destacada = o.destacada ? '1' : '0';
  const boton = $<HTMLElement>('.obra__boton', li);
  if (boton) {
    Object.assign(boton.dataset, { titulo: v.titulo, autor: v.autor, datos: v.datos });
    if (foto) Object.assign(boton.dataset, { grande: foto.url, ancho: String(foto.ancho), alto: String(foto.alto) });
  }
  const img = $<HTMLImageElement>('img', li);
  if (img && foto) {
    img.removeAttribute('srcset');
    img.src = foto.url;
    img.width = foto.ancho / 2;
    img.height = foto.alto / 2;
  }
  const t = $('.cartela__titulo', li);
  if (t) t.textContent = v.titulo;
  const a = $('.cartela__autor', li);
  if (a) a.textContent = v.autor;
  const p = $('.cartela__tecnica', li);
  if (p) p.replaceChildren(...[...p.children].slice(0, 1), ' ' + v.tecnica);
  const estrella = $('.cartela__expo', li);
  if (o.destacada && !estrella) $('.cartela', li)?.insertAdjacentHTML('beforeend', '<span class="cartela__expo" title="Obra destacada">★</span>');
  if (!o.destacada) estrella?.remove();
}

async function subirObra() {
  let c: Contenido | null = null;
  try {
    c = await Promise.race([contenido(), new Promise<null>((r) => setTimeout(() => r(null), 2500))]);
  } catch {}
  let estado: ReturnType<typeof prepararFoto>;
  abrirDialogo({
    titulo: 'Subir una obra',
    textoGuardar: 'Subir obra',
    cuerpo: formularioObra(c),
    alAbrir: (f) => (estado = prepararFoto(f)),
    guardar: async (f) => {
      if (!estado.foto) throw new Error('Falta la foto: tómala o elígela de la galería');
      const fd = datosObra(f);
      fd.set('foto', estado.foto.blob, 'obra.jpg');
      const barra = progreso(f);
      barra(0);
      try {
        const r = await enviarConProgreso('/api/obras', 'POST', fd, barra);
        const o: ObraVivo = { ...r.obra, id: r.obra._id, miniatura: estado.url, imagen: estado.url };
        if (c) c.obras.unshift(o);
        pintarObra(c, o, { url: estado.url, ancho: estado.foto.ancho, alto: estado.foto.alto });
      } finally {
        barra(null);
      }
      avisar('¡Obra subida! Aparecerá en la galería pública en ~1 minuto.', 'ok', { texto: 'Subir otra', fn: subirObra }, 8000);
    },
  });
}

async function editarObra(id: string) {
  cargandoDialogo('Editar obra');
  const c = await contenido();
  const o = c.obras.find((x) => x.id === id);
  if (!o) {
    dialogo.close();
    return avisar('Esa obra ya no existe (quizás se borró).', 'error');
  }
  let estado: ReturnType<typeof prepararFoto>;
  abrirDialogo({
    titulo: 'Editar obra',
    cuerpo: formularioObra(c, o),
    extra: '<button type="button" class="boton boton--claro ed-borrar">🗑 Borrar</button>',
    alAbrir: (f) => {
      estado = prepararFoto(f);
      $('.ed-borrar', f)!.onclick = () => borrarObra(id);
    },
    guardar: async (f) => {
      const fd = datosObra(f);
      if (estado.foto) fd.set('foto', estado.foto.blob, 'obra.jpg');
      const barra = progreso(f);
      barra(0);
      try {
        const r = await enviarConProgreso(`/api/obras/${encodeURIComponent(id)}`, 'PATCH', fd, barra);
        Object.assign(o, { titulo: undefined, alumno: undefined, edad: undefined, nivel: undefined }, r.obra, { id });
        if (estado.foto) o.imagen = o.miniatura = estado.url;
      } finally {
        barra(null);
      }
      pintarObra(c, o, estado.foto ? { url: estado.url, ancho: estado.foto.ancho, alto: estado.foto.alto } : undefined);
      avisar('¡Obra actualizada! El sitio se actualiza en ~1 minuto.');
    },
  });
}

async function borrarObra(id: string) {
  if (!confirm('¿Borrar esta obra de la galería? No se puede deshacer.')) return;
  try {
    await api(`/api/obras/${encodeURIComponent(id)}`, 'DELETE');
    if (dialogo.open) dialogo.close();
    const li = $<HTMLElement>(`.obra[data-id="${CSS.escape(id)}"]`);
    li?.classList.add('ed-saliendo');
    setTimeout(() => li?.remove(), 400);
    if (contenidoPromesa) contenidoPromesa.then((c) => (c.obras = c.obras.filter((o) => o.id !== id))).catch(() => {});
    avisar('Obra borrada.');
  } catch (e) {
    avisar((e as Error).message, 'error');
  }
}

function agregarAccionesObra(li: HTMLElement) {
  if ($('.ed-acciones', li)) return;
  li.insertAdjacentHTML(
    'afterbegin',
    `<div class="ed-acciones"><button type="button" data-ed="editar-obra">✎ Editar</button><button type="button" data-ed="borrar-obra" aria-label="Borrar obra">🗑</button></div>`,
  );
}

// ---------------------------------------------------------------- exposiciones
function formularioExpo(e?: ExpoVivo) {
  return `
    <label class="ed-campo"><span>Nombre</span><input type="text" name="nombre" maxlength="80" required value="${esc(e?.nombre)}" placeholder="Ej: Tercera exposición de alumnos" /></label>
    <div class="ed-fila">
      <label class="ed-campo"><span>Número corto</span><input type="text" name="numero" maxlength="6" required value="${esc(e?.numero)}" placeholder="Ej: 3era" /></label>
      <label class="ed-campo"><span>Fecha</span><input type="date" name="fecha" required value="${esc(e?.fecha)}" /></label>
    </div>
    <label class="ed-campo"><span>Descripción</span><textarea name="descripcion" rows="4" maxlength="1200">${esc(e?.descripcion)}</textarea></label>`;
}
const datosExpo = (f: HTMLFormElement) => {
  const fd = new FormData(f);
  const d = Object.fromEntries(['nombre', 'numero', 'fecha', 'descripcion'].map((k) => [k, String(fd.get(k) ?? '').trim()]));
  if (!d.nombre) throw new Error('Falta el nombre');
  if (!d.numero) throw new Error('Falta el número corto (ej: 3era)');
  if (!d.fecha) throw new Error('Falta la fecha');
  return d;
};

async function editarExpo(id: string) {
  cargandoDialogo('Exposición');
  const c = await contenido();
  const e = c.exposiciones.find((x) => x.id === id);
  if (!e) {
    dialogo.close();
    return avisar('Esa exposición ya no existe.', 'error');
  }
  abrirDialogo({
    titulo: 'Exposición',
    cuerpo: formularioExpo(e) + '<p class="ed-nota">Las fotos se agregan o quitan en la página Exposiciones. El video se cambia desde el panel de Sanity.</p>',
    extra: '<button type="button" class="boton boton--claro ed-borrar">🗑 Borrar</button>',
    alAbrir: (f) => {
      $('.ed-borrar', f)!.onclick = async () => {
        if (!confirm(`¿Borrar la exposición "${e.nombre}" con todas sus fotos? No se puede deshacer.`)) return;
        try {
          await api(`/api/exposiciones/${encodeURIComponent(id)}`, 'DELETE');
          dialogo.close();
          c.exposiciones = c.exposiciones.filter((x) => x.id !== id);
          avisar('Exposición borrada. Desaparecerá del sitio en ~1 minuto.');
        } catch (err) {
          avisar((err as Error).message, 'error');
        }
      };
    },
    guardar: async (f) => {
      const d = datosExpo(f);
      await api(`/api/exposiciones/${encodeURIComponent(id)}`, 'PATCH', d);
      Object.assign(e, d);
      for (const el of $$(`[data-valor^="expo:${id}."]`)) {
        const campo = el.dataset.valor!.split('.').at(-1)!;
        const v = (e as any)[campo];
        if (typeof v === 'string') el.textContent = el.dataset.formato === 'fecha' ? fechaLarga(v) : v;
      }
      avisar('¡Guardado! El sitio se actualiza en ~1 minuto.');
    },
  });
}

async function nuevaExpo() {
  abrirDialogo({
    titulo: 'Nueva exposición',
    textoGuardar: 'Crear exposición',
    cuerpo:
      formularioExpo() +
      `<label class="ed-campo"><span>Fotos de la jornada <small>(puedes elegir varias)</small></span>
        <input type="file" name="fotos" accept="image/*" multiple /></label>
       <div class="ed-progreso" hidden><span></span></div>
       <p class="ed-nota">El video representativo se agrega después desde el panel de Sanity.</p>`,
    guardar: async (f) => {
      const d = datosExpo(f);
      const archivos = [...(($<HTMLInputElement>('input[name=fotos]', f)!.files ?? []) as FileList)];
      const r = await api('/api/exposiciones', 'POST', d);
      const id = r.exposicion._id as string;
      if (contenidoPromesa) contenidoPromesa.then((c) => c.exposiciones.unshift({ id, ...d, fotos: [] } as ExpoVivo)).catch(() => {});
      if (archivos.length) {
        const barra = progreso(f);
        const fallidas = await subirFotosExpo(id, archivos, (i, p) => barra((i + p) / archivos.length));
        barra(null);
        if (fallidas) avisar(`${fallidas} foto(s) no se pudieron subir. Puedes agregarlas después.`, 'error', undefined, 9000);
      }
      avisar('¡Exposición creada! Aparecerá en el sitio en ~1 minuto.', 'ok', undefined, 8000);
    },
  });
}

/** Sube varias fotos de una exposición, una por una. Devuelve cuántas fallaron. */
async function subirFotosExpo(id: string, archivos: File[], alProgreso: (i: number, p: number) => void, alSubir?: (clave: string, url: string) => void) {
  let fallidas = 0;
  for (const [i, archivo] of archivos.entries()) {
    try {
      const { blob } = await comprimir(archivo);
      const fd = new FormData();
      fd.set('foto', blob, `foto-${i + 1}.jpg`);
      const r = await enviarConProgreso(`/api/exposiciones/${encodeURIComponent(id)}/fotos`, 'POST', fd, (p) => alProgreso(i, p));
      alSubir?.(r.foto._key, URL.createObjectURL(blob));
    } catch (e) {
      fallidas++;
      if ((e as ErrorApi).status === 401) throw e;
    }
  }
  return fallidas;
}

function prepararFotosExpo() {
  for (const ul of $$('ul.fotos[data-expo]')) {
    const id = ul.dataset.expo!;
    if (!id) continue;
    for (const li of $$('li[data-clave]', ul)) {
      if ($('.ed-quitar', li) || !li.dataset.clave) continue;
      li.insertAdjacentHTML('afterbegin', '<button type="button" class="ed-quitar" data-ed="quitar-foto" aria-label="Quitar esta foto">✕</button>');
    }
    if (!$('.ed-agregar', ul)) {
      ul.insertAdjacentHTML(
        'beforeend',
        `<li class="ed-agregar"><label><span>＋</span>Agregar fotos<input type="file" accept="image/*" multiple hidden /></label></li>`,
      );
      $<HTMLInputElement>('.ed-agregar input', ul)!.addEventListener('change', async (e) => {
        const input = e.target as HTMLInputElement;
        const archivos = [...(input.files ?? [])];
        input.value = '';
        if (!archivos.length) return;
        const aviso = avisar(`Subiendo foto 1 de ${archivos.length}…`, 'info', undefined, 0);
        try {
          const fallidas = await subirFotosExpo(
            id,
            archivos,
            (i, p) => aviso.texto(`Subiendo foto ${i + 1} de ${archivos.length}… ${Math.round(p * 100)}%`),
            (clave, url) => {
              ul.querySelector('.ed-agregar')!.insertAdjacentHTML(
                'beforebegin',
                `<li class="foto visible ed-nueva" data-clave="${esc(clave)}"><button type="button" class="ed-quitar" data-ed="quitar-foto" aria-label="Quitar esta foto">✕</button><img src="${esc(url)}" alt="" /></li>`,
              );
            },
          );
          aviso.quitar();
          avisar(fallidas ? `${archivos.length - fallidas} subidas, ${fallidas} con error.` : '¡Fotos agregadas! Se verán en el sitio en ~1 minuto.', fallidas ? 'error' : 'ok');
        } catch (err) {
          aviso.quitar();
          avisar((err as Error).message, 'error');
        }
      });
    }
  }
}

async function quitarFoto(li: HTMLElement) {
  const ul = li.closest<HTMLElement>('ul[data-expo]')!;
  if (!confirm('¿Quitar esta foto de la exposición?')) return;
  try {
    await api(`/api/exposiciones/${encodeURIComponent(ul.dataset.expo!)}/fotos/${encodeURIComponent(li.dataset.clave!)}`, 'DELETE');
    li.classList.add('ed-saliendo');
    setTimeout(() => li.remove(), 400);
    avisar('Foto quitada.');
  } catch (e) {
    avisar((e as Error).message, 'error');
  }
}

// ---------------------------------------------------------------- publicación
let vigilando = 0;
let avisoPublicando: ReturnType<typeof avisar> | null = null;
let estadoEl: HTMLElement;

async function vigilarPublicacion() {
  clearTimeout(vigilando);
  const cambio = Number(leerLocal('breda-cambio') || 0);
  if (!cambio) return;
  let compilado = 0;
  try {
    compilado = (await (await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' })).json()).compilado;
  } catch {}
  if (compilado >= cambio) {
    guardarLocal('breda-cambio', null);
    estadoEl.hidden = true;
    avisoPublicando?.quitar();
    avisoPublicando = null;
    if (document.visibilityState === 'visible' && !dialogo.open)
      avisar('✓ Cambios publicados en el sitio.', 'ok', { texto: 'Ver', fn: () => location.reload() }, 10000);
    return;
  }
  estadoEl.hidden = false;
  vigilando = window.setTimeout(vigilarPublicacion, 10000);
}

// ---------------------------------------------------------------- sesión
function sesionVencida() {
  guardarLocal('breda-admin', null);
  avisar('Tu sesión terminó.', 'error', { texto: 'Entrar de nuevo', fn: () => (location.href = '/admin') }, 0);
}

// ---------------------------------------------------------------- inicio
async function iniciar() {
  pilaAvisos = document.createElement('div');
  pilaAvisos.className = 'ed-avisos';
  document.body.append(pilaAvisos);

  let ses: { ok: boolean; correo?: string };
  try {
    ses = await (await fetch('/api/sesion', { credentials: 'same-origin' })).json();
  } catch {
    return; // sin conexión o sin funciones (por ejemplo en "astro dev"): no mostrar nada
  }
  if (!ses.ok) {
    guardarLocal('breda-admin', null);
    return;
  }

  dialogo = document.createElement('dialog');
  dialogo.className = 'ed-dialogo';
  dialogo.addEventListener('close', () => document.body.classList.remove('ed-con-dialogo'));
  dialogo.addEventListener('click', (e) => e.target === dialogo && dialogo.close());
  document.body.append(dialogo);

  const enExpos = location.pathname.startsWith('/exposiciones');
  const barra = document.createElement('div');
  barra.className = 'ed-barra';
  barra.setAttribute('role', 'toolbar');
  barra.setAttribute('aria-label', 'Modo edición');
  barra.innerHTML = `
    <p class="ed-estado" hidden><span class="ed-estado__punto"></span>Publicando cambios…</p>
    <button type="button" class="ed-barra__modo" aria-pressed="true"><span class="ed-interruptor"></span>Editar</button>
    <button type="button" class="ed-barra__accion" data-ed="subir-obra">＋ Obra</button>
    ${enExpos ? '<button type="button" class="ed-barra__accion" data-ed="nueva-expo">＋ Expo<span class="ed-largo">sición</span></button>' : ''}
    <a class="ed-barra__salir" href="/admin" title="Sesión: ${esc(ses.correo)}" aria-label="Cuenta y cerrar sesión">⎋</a>`;
  document.body.append(barra);
  estadoEl = $('.ed-estado', barra)!;

  const botonModo = $<HTMLButtonElement>('.ed-barra__modo', barra)!;
  const aplicarModo = (activo: boolean) => {
    document.body.classList.toggle('ed-activo', activo);
    botonModo.setAttribute('aria-pressed', String(activo));
    guardarLocal('breda-modo', activo ? '1' : '0');
    if (activo) {
      $$('.obra[data-id]').forEach(agregarAccionesObra);
      prepararFotosExpo();
    }
  };
  botonModo.onclick = () => aplicarModo(!document.body.classList.contains('ed-activo'));
  aplicarModo(leerLocal('breda-modo') !== '0');
  if (leerLocal('breda-ayuda') !== 'vista') {
    avisar('Modo edición: toca cualquier texto con borde punteado para cambiarlo.', 'info', { texto: 'Entendido', fn: () => guardarLocal('breda-ayuda', 'vista') }, 0);
  }

  // Un solo manejador para todos los clics del modo edición
  document.addEventListener(
    'click',
    (e) => {
      const t = e.target as HTMLElement;
      const accion = t.closest<HTMLElement>('[data-ed]');
      if (accion) {
        e.preventDefault();
        e.stopPropagation();
        const tipo = accion.dataset.ed;
        const fallo = (err: Error) => {
          if (dialogo.open) dialogo.close();
          avisar(err.message, 'error');
          if ((err as ErrorApi).status === 401) sesionVencida();
        };
        if (tipo === 'subir-obra') subirObra().catch(fallo);
        if (tipo === 'nueva-expo') nuevaExpo().catch(fallo);
        if (tipo === 'editar-obra') editarObra(accion.closest<HTMLElement>('.obra')!.dataset.id!).catch(fallo);
        if (tipo === 'borrar-obra') borrarObra(accion.closest<HTMLElement>('.obra')!.dataset.id!);
        if (tipo === 'quitar-foto') quitarFoto(accion.closest<HTMLElement>('li')!);
        return;
      }
      if (!document.body.classList.contains('ed-activo') || t.closest('.ed-barra, .ed-dialogo, .ed-avisos, .ed-agregar')) return;
      const zona = t.closest<HTMLElement>('[data-editar]');
      const clave = zona?.dataset.editar;
      if (!zona || !clave) return;
      e.preventDefault();
      e.stopPropagation();
      const fallo = (err: Error) => {
        if (dialogo.open) dialogo.close();
        avisar(err.message, 'error');
        if ((err as ErrorApi).status === 401) sesionVencida();
      };
      if (clave.startsWith('expo:')) editarExpo(clave.slice(5)).catch(fallo);
      else if (clave === 'hero.obras' || clave === 'quienesSomos.obras') elegirObras(clave).catch(fallo);
      else editarTextos(clave.split(',')).catch(fallo);
    },
    true,
  );

  contenido().catch(() => {}); // precargar
  vigilarPublicacion();
  if (new URLSearchParams(location.search).get('subir') === '1') {
    history.replaceState(null, '', location.pathname);
    subirObra();
  }
}

iniciar();
