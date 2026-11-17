# Estudio BREDA — sitio web

Sitio del **Estudio de Arte y dibujo BREDA** ([@estudiobreda_arte](https://www.instagram.com/estudiobreda_arte/)).

Arquitectura: **sitio estático (Astro) + CMS administrado (Sanity, pendiente)**.
Por ahora el contenido vive en archivos JSON locales; cuando se conecte el CMS,
tu hermana podrá editar textos e imágenes desde un panel de administración.

## Cómo verlo en tu computador

```bash
npm install
npm run dev
```

Abre <http://localhost:4321>. Para verlo en el celular (en la misma red wifi),
usa la dirección "Network" que aparece en la terminal.

## Dónde se cambia cada cosa (mientras no haya CMS)

| Qué | Archivo |
|---|---|
| Textos, precio, WhatsApp, Instagram | `src/data/sitio.json` |
| Obras de la galería (título, alumno, edad, técnica, destacada) | `src/data/obras.json` |
| Imágenes de las obras | `public/obras/` (versión normal y `-mini`) |
| Colores y tipografías | `src/styles/global.css` (variables al inicio) |

El precio está en `clases.plan.precio` (hoy: 27000, 2 veces a la semana).

## Obras de la galería (desde Instagram)

Las 259 obras vienen de las publicaciones de @estudiobreda_arte:

1. `herramientas/instagram/descargar.bat` baja solo las fotos (sin videos) a
   `herramientas/instagram/descargas/`.
2. `herramientas/instagram/seleccion.json` dice qué fotos son obras (se excluyeron
   afiches y fotos con personas), su **técnica estimada** y cuáles son **destacadas**.
3. `npm run obras` convierte esas fotos a `public/obras/` y genera `src/data/obras.json`.

En `obras.json` se pueden completar a mano `titulo`, `alumno`, `edad` y `nivel`
(`ninos`, `jovenes`, `adultos`): el sitio los muestra apenas existan, y el filtro
por edad aparece solo cuando hay obras con `nivel`. Ojo: `npm run obras` vuelve a
generar `obras.json` desde cero.

Las texturas decorativas se regeneran con `npm run arte`.

## Exposiciones

Página `/exposiciones` y sección en el inicio. Textos (nombre, fecha, descripción)
en `src/data/sitio.json` → `exposiciones.lista`. Fotos y videos en `public/exposiciones/<id>/`.

- **Fotos:** `npm run exposiciones` toma las carpetas `E:/FOTOS 1RA EXPO` y
  `E:/FOTOS 2DA EXPO` (configurables en `scripts/importar-exposiciones.mjs`),
  las convierte a .webp y saca la portada de cada video.
- **Videos:** se comprimen con ffmpeg antes de ponerlos en la carpeta:

```bash
ffmpeg -i "video-original.mp4" -c:v libx264 -preset medium -crf 28 -maxrate 1200k -bufsize 2400k -pix_fmt yuv420p -c:a aac -b:a 96k -movflags +faststart public/exposiciones/2da/video.mp4
```

Los videos se cargan recién cuando alguien aprieta "play".

## Panel de administración (Sanity)

- **Panel:** https://estudiobreda.sanity.studio (proyecto `4jx0qts1`, dataset `production`).
  Desde ahí se suben obras (con la cámara o la galería del teléfono), se editan los
  textos, el precio y las exposiciones.
- **Código del panel:** carpeta `studio/` (formularios en `studio/schemas/`).
  Para publicar cambios del panel: `cd studio && npx sanity deploy`.
- **El sitio** lee todo desde Sanity al compilarse (`src/lib/sanity.ts`).
  Sin internet se puede usar el contenido local: `CONTENIDO=local npm run build`.
- **Invitar editores:** `cd studio && npx sanity users invite correo@ejemplo.com --role editor`.
- Los JSON de `src/data/` y los scripts `npm run obras` / `npm run exposiciones`
  quedaron solo como respaldo: el contenido oficial ahora está en Sanity.

## Publicación (Netlify)

- **Sitio:** https://tallerbreda.netlify.app (repositorio privado `pavlovw/estudio-breda`, rama `main`).
- **Se actualiza solo:** al publicar algo en el panel, un webhook de Sanity
  ("Publicar sitio en Netlify") llama al build hook de Netlify y el sitio se
  vuelve a armar en 1–2 minutos. Los borradores no disparan nada.
- **Cambios de código:** `git push` a `main` también publica.

## Backend del panel /admin (funciones de Netlify)

Carpeta `netlify/`. Rutas (todas exigen sesión salvo el login):

| Ruta | Qué hace |
|---|---|
| `POST /api/login` · `POST /api/logout` · `GET /api/sesion` | Iniciar/cerrar sesión (cookie segura, 14 días; 5 intentos fallidos = 15 min de espera) |
| `POST /api/obras` · `PATCH/DELETE /api/obras/:id` | Subir, editar o borrar obras (foto máx. 5 MB) |
| `PATCH /api/sitio` | Editar textos y precio (solo campos permitidos) |
| `/api/exposiciones[/:id[/fotos[/:clave]]]` | Crear/editar/borrar exposiciones y sus fotos |
| `GET /api/contenido` | Lo último guardado en Sanity (para los formularios del modo edición) |

### Modo edición (`/admin`)

1. Entrar en **/admin** con correo y contraseña.
2. El sitio se ve igual que para los visitantes, con una barra abajo:
   **Editar** (activa/desactiva los bordes punteados), **＋ Obra**, **＋ Expo** (en Exposiciones) y **⎋** (cuenta / cerrar sesión).
3. Tocar un texto con borde punteado abre su formulario. Las fotos de la portada y de
   "Quiénes somos" se eligen entre las obras de la galería.
4. En la galería cada obra tiene **✎ Editar** y **🗑**; en Exposiciones cada foto tiene **✕** y al final **＋ Agregar fotos**.
5. Las fotos se achican en el mismo teléfono antes de subirse (máx. 2200 px, ~3 MB).
6. Tras guardar, la píldora "Publicando cambios…" desaparece cuando el sitio ya se volvió a publicar (`/version.json`).

Código: `src/admin/editor.ts` (solo se descarga si se inició sesión) y `src/pages/admin.astro`.
Los textos editables se marcan en los componentes con `data-editar="ruta"` y `data-valor="ruta"`.

**Variables de entorno en Netlify** (*Site configuration → Environment variables*, marcadas como secretas):

- `SANITY_WRITE_TOKEN`: token de Sanity con permiso de escritura (sanity.io/manage → API → Tokens).
- `ADMIN_USUARIOS` y `SESSION_SECRET`: se generan con `npm run crear-admin`
  (pide correo y contraseña; la contraseña nunca se guarda, solo su versión cifrada).

## Estructura

```
src/
  data/          contenido (JSON) → luego vendrá de Sanity
  lib/contenido.ts  única puerta de acceso al contenido (aquí se conecta el CMS)
  components/    secciones del sitio (Hero, Galeria, Visor, Clases, ...)
  layouts/       plantilla base (encabezado, pie, animaciones globales)
  pages/         index (inicio) y galeria
public/
  obras/         imágenes de la galería
  texturas/      papel, lienzo, manchas de acuarela, texturas por técnica
```

## Próximos pasos

1. Fotos reales de las obras y textos definitivos (quiénes somos, horarios, dirección).
2. Conectar Sanity: panel `/admin` para editar textos y subir obras.
3. Publicar en Netlify o Vercel con dominio propio.
