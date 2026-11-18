// Texturas ilustradas de las técnicas carboncillo, plumones de alcohol y
// plumones acrílicos (las usa generar-arte.mjs). Cada una muestra el material
// y lo que se hace con él. Lo importante queda en la franja central (y 170-390),
// que es lo que se ve en la tarjeta; el resto aparece al pasar el mouse.

const f = (n) => Number(n).toFixed(1);

/** Carboncillo: estudio de esfera, trazos secos, difuminado con el dedo y la barra de carbón */
export function carboncillo(k, W, H) {
  const { R } = k;
  let s = '';
  // difuminados grandes (con la mano)
  for (let i = 0; i < 6; i++)
    s += `<ellipse cx="${f(R(80, W - 80))}" cy="${f(R(120, H - 120))}" rx="${f(R(120, 240))}" ry="${f(R(40, 90))}" fill="#3b3833" opacity="${f(R(0.08, 0.18))}" filter="url(#wc)"/>`;

  // estudio de esfera: degradado + achurado + sombra proyectada + brillo borrado con goma
  const cx = 250, cy = 285, r = 118;
  s += `<defs>
    <radialGradient id="esfera" cx="0.35" cy="0.32" r="0.8">
      <stop offset="0" stop-color="#e9e3d6"/><stop offset="0.45" stop-color="#8a847a"/><stop offset="0.85" stop-color="#2a2724"/><stop offset="1" stop-color="#47433d"/>
    </radialGradient>
    <clipPath id="clipEsfera"><circle cx="${cx}" cy="${cy}" r="${r}"/></clipPath>
    <linearGradient id="barra" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a3a3a"/><stop offset="0.5" stop-color="#121212"/><stop offset="1" stop-color="#050505"/></linearGradient>
  </defs>`;
  s += `<ellipse cx="${cx + 70}" cy="${cy + r - 6}" rx="${r * 1.05}" ry="26" fill="#1f1d1a" opacity="0.55" filter="url(#wc)"/>`;
  s += `<g filter="url(#crayon)"><circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#esfera)"/></g>`;
  let a = '';
  for (let d = -r; d < r; d += 7) a += `<line x1="${cx - r}" y1="${f(cy + d)}" x2="${cx + r}" y2="${f(cy + d - r * 0.9)}" stroke="#1a1816" stroke-width="${f(R(1.6, 3))}" opacity="${f(R(0.25, 0.55))}"/>`;
  s += `<g clip-path="url(#clipEsfera)"><g transform="translate(40 50)" filter="url(#crayon)">${a}</g></g>`;
  s += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#141210" stroke-width="5" opacity="0.7" filter="url(#crayon)"/>`;
  s += `<ellipse cx="${cx - 42}" cy="${cy - 46}" rx="26" ry="16" fill="#f4efe4" opacity="0.85" transform="rotate(-30 ${cx - 42} ${cy - 46})" filter="url(#soft)"/>`;

  // trazos gestuales secos
  const trazos = [
    'M470 150 C 560 110, 680 140, 770 120',
    'M430 420 C 520 360, 600 470, 760 400',
    'M520 210 C 600 260, 640 330, 780 300',
    'M20 120 C 80 60, 160 90, 210 60',
  ];
  for (const d of trazos) s += `<path d="${d}" fill="none" stroke="#151412" stroke-width="${f(R(9, 18))}" stroke-linecap="round" opacity="0.85" filter="url(#crayon)"/>`;

  // huella del dedo al difuminar
  let huella = '';
  for (let i = 1; i < 9; i++) huella += `<ellipse cx="0" cy="0" rx="${i * 5.2}" ry="${i * 6.6}" fill="none" stroke="#3a3632" stroke-width="1.6" opacity="${f(0.55 - i * 0.04)}"/>`;
  s += `<g transform="translate(640 225) rotate(24)" filter="url(#rough)">${huella}</g>`;

  // barra de carboncillo con la punta gastada + polvo
  s += `<g transform="translate(470 330) rotate(-14)">
    <path d="M0 0 h210 l14 6 l-6 9 l10 8 l-18 5 h-210 z" fill="url(#barra)" filter="url(#rough)"/>
    <path d="M6 5 h196" stroke="#5a5a5a" stroke-width="2" opacity="0.6"/>
  </g>`;
  for (let i = 0; i < 70; i++) s += `<circle cx="${f(R(640, 760))}" cy="${f(R(300, 380))}" r="${f(R(0.8, 3))}" fill="#1a1a1a" opacity="${f(R(0.3, 0.8))}"/>`;
  return s;
}

/** Plumones de alcohol: muestrario de capas, degradado fundido y el plumón doble punta */
export function plumonesAlcohol(k, W, H) {
  const { R } = k;
  const colores = ['#ff5fa2', '#ffb703', '#3bceac', '#4f8cff', '#9b5de5'];
  let s = '<g style="mix-blend-mode:multiply">';

  // degradado fundido arriba (lo característico: los colores se mezclan sin marcas)
  s += `<defs><linearGradient id="fundido" x1="0" x2="1"><stop offset="0" stop-color="#ff5fa2"/><stop offset="0.35" stop-color="#ffb703"/><stop offset="0.65" stop-color="#3bceac"/><stop offset="1" stop-color="#4f8cff"/></linearGradient></defs>`;
  s += `<path d="M30 110 C 200 40, 380 160, 560 90 S 760 60, 790 100" fill="none" stroke="url(#fundido)" stroke-width="54" stroke-linecap="round" opacity="0.75"/>`;

  // muestrario: por color, trazos verticales de punta biselada que se superponen (vetas más oscuras)
  colores.forEach((c, i) => {
    const x0 = 34 + i * 152;
    for (let j = 0; j < 5; j++) {
      const x = x0 + j * 20;
      s += `<rect x="${f(x)}" y="${f(180 + R(-6, 6))}" width="28" height="${f(R(170, 190))}" rx="12" fill="${c}" opacity="0.42"/>`;
    }
    // segunda y tercera capa: el mismo color se oscurece
    s += `<rect x="${x0}" y="300" width="128" height="60" rx="12" fill="${c}" opacity="0.38"/>`;
    s += `<rect x="${x0}" y="335" width="128" height="30" rx="12" fill="${c}" opacity="0.38"/>`;
    // vetas finas del bisel
    for (let j = 0; j < 6; j++) s += `<line x1="${f(x0 + 8 + j * 20)}" y1="190" x2="${f(x0 + 8 + j * 20)}" y2="355" stroke="${c}" stroke-width="1.2" opacity="0.5"/>`;
  });

  // esfera pintada en tres tonos (luz, medio, sombra)
  s += `<circle cx="160" cy="470" r="62" fill="#9b5de5" opacity="0.35"/><circle cx="174" cy="484" r="48" fill="#9b5de5" opacity="0.35"/><circle cx="186" cy="496" r="30" fill="#5a2ca0" opacity="0.4"/>`;
  s += '</g>';

  // el plumón: cuerpo, tapa de color y dos puntas (fina y biselada)
  s += `<g transform="translate(380 470) rotate(-8)">
    <rect x="0" y="-22" width="300" height="44" rx="10" fill="#f0f0f0" stroke="#c9c9c9" stroke-width="2"/>
    <rect x="40" y="-22" width="70" height="44" fill="#ff5fa2"/>
    <text x="150" y="7" font-family="sans-serif" font-size="16" font-weight="700" fill="#999">ALCOHOL</text>
    <rect x="300" y="-16" width="70" height="32" rx="8" fill="#ff5fa2"/>
    <path d="M0 -14 l-34 8 l-6 6 l6 6 l34 8 z" fill="#d9d9d9"/>
    <path d="M-40 -2 l-24 2 l24 2 z" fill="#ff5fa2"/>
  </g>`;
  return s;
}

/** Plumones acrílicos: arte de puntos (mandala), dibujos opacos sobre fondo oscuro y el plumón */
export function plumonesAcrilico(k, W, H) {
  const { R, P } = k;
  const cs = ['#fefae0', '#ff4fa3', '#ffd60a', '#3ad6e8', '#7bf1a8', '#ff7b39', '#b388ff'];
  let s = '';
  // mandala de puntos: anillos concéntricos, cada punto con brillo de pintura
  const cx = 230, cy = 285;
  s += `<circle cx="${cx}" cy="${cy}" r="16" fill="#ffd60a"/><circle cx="${cx - 5}" cy="${cy - 5}" r="5" fill="#fff" opacity="0.6"/>`;
  [[34, 10, 9], [62, 16, 10], [92, 22, 11], [124, 30, 10], [156, 38, 9], [186, 48, 7]].forEach(([rad, n, tam], i) => {
    const color = cs[(i * 2 + 1) % cs.length];
    for (let j = 0; j < n; j++) {
      const ang = (j / n) * Math.PI * 2 + (i % 2) * (Math.PI / n);
      const x = cx + Math.cos(ang) * rad, y = cy + Math.sin(ang) * rad;
      s += `<circle cx="${f(x)}" cy="${f(y)}" r="${tam}" fill="${color}"/><circle cx="${f(x - tam * 0.3)}" cy="${f(y - tam * 0.3)}" r="${f(tam * 0.3)}" fill="#fff" opacity="0.5"/>`;
    }
  });

  // dibujos opacos y contorneados (lo típico del plumón acrílico)
  const contorno = 'stroke="#fefae0" stroke-width="6" stroke-linejoin="round" stroke-linecap="round"';
  s += `<path d="M560 220 c-30 -40 -90 -20 -80 30 c8 40 80 80 80 80 s72 -40 80 -80 c10 -50 -50 -70 -80 -30 z" fill="#ff4fa3" ${contorno}/>`; // corazón
  s += `<path d="M700 150 l14 30 l33 4 l-24 22 l7 32 l-30 -16 l-30 16 l7 -32 l-24 -22 l33 -4 z" fill="#ffd60a" ${contorno}/>`; // estrella
  s += `<path d="M430 400 l30 -30 l30 30 l30 -30 l30 30 l30 -30 l30 30" fill="none" stroke="#3ad6e8" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>`; // zigzag
  s += `<path d="M700 270 l-26 50 h26 l-18 52 l50 -66 h-28 l20 -36 z" fill="#7bf1a8" ${contorno}/>`; // rayo
  s += `<circle cx="470" cy="150" r="34" fill="none" stroke="#ff7b39" stroke-width="10"/><circle cx="470" cy="150" r="14" fill="#ff7b39"/>`;
  // puntitos y estrellitas sueltas
  for (let i = 0; i < 40; i++) s += `<circle cx="${f(R(420, 790))}" cy="${f(R(20, 540))}" r="${f(R(3, 7))}" fill="${P(cs)}"/>`;

  // el plumón acrílico con una gota de pintura en la punta
  s += `<g transform="translate(470 480) rotate(-6)">
    <rect x="0" y="-20" width="250" height="40" rx="8" fill="#2b2b2b" stroke="#fefae0" stroke-width="3"/>
    <rect x="250" y="-15" width="60" height="30" rx="6" fill="#ff4fa3"/>
    <text x="70" y="7" font-family="sans-serif" font-size="15" font-weight="800" fill="#fefae0">PAINT</text>
    <path d="M0 -12 l-26 8 v8 l26 8 z" fill="#bdbdbd"/>
    <path d="M-26 -4 h-14 v8 h14 z" fill="#ffd60a"/>
    <circle cx="-46" cy="16" r="7" fill="#ffd60a"/>
  </g>`;
  return `<g filter="url(#rough)">${s}</g>`;
}
