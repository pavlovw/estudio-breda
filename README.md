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
