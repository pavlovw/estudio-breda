// Genera obras de EJEMPLO y texturas pictóricas para el sitio.
// Las obras son solo de muestra: luego se reemplazan por fotos reales de los alumnos
// (desde el panel de administración / CMS).
//
// Uso: npm run arte

import sharp from 'sharp';
import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT_OBRAS = path.join(ROOT, 'public', 'obras');
const OUT_TEX = path.join(ROOT, 'public', 'texturas');
const DATA = path.join(ROOT, 'src', 'data', 'obras.json');

// ---------- utilidades ----------
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const f = (n) => Number(n).toFixed(1);
function hexToRgb(h) {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const rgbToHex = (c) => '#' + c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
const mix = (a, b, t) => { const A = hexToRgb(a), B = hexToRgb(b); return rgbToHex(A.map((v, i) => v + (B[i] - v) * t)); };
const jitter = (h, r, amt = 18) => rgbToHex(hexToRgb(h).map((v) => v + (r() - 0.5) * 2 * amt));
function ramp(stops, t) {
  t = Math.max(0, Math.min(0.9999, t));
  const s = t * (stops.length - 1);
  const i = Math.floor(s);
  return mix(stops[i], stops[i + 1], s - i);
}

function kit(seed) {
  const r = rng(seed);
  const R = (a, b) => a + r() * (b - a);
  const P = (arr) => arr[Math.floor(r() * arr.length)];
  return { r, R, P };
}

function defs(seed) {
  return `
  <filter id="wc" x="-30%" y="-30%" width="160%" height="160%">
    <feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="3" seed="${seed}" result="n"/>
    <feDisplacementMap in="SourceGraphic" in2="n" scale="55" xChannelSelector="R" yChannelSelector="G" result="d"/>
    <feGaussianBlur in="d" stdDeviation="3"/>
  </filter>
  <filter id="wcEdge" x="-30%" y="-30%" width="160%" height="160%">
    <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="4" seed="${seed + 3}" result="n"/>
    <feDisplacementMap in="SourceGraphic" in2="n" scale="30" xChannelSelector="R" yChannelSelector="G"/>
  </filter>
  <filter id="rough" x="-10%" y="-10%" width="120%" height="120%">
    <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="${seed + 1}" result="n"/>
    <feDisplacementMap in="SourceGraphic" in2="n" scale="6" xChannelSelector="R" yChannelSelector="G"/>
  </filter>
  <filter id="impasto" x="-5%" y="-5%" width="110%" height="110%">
    <feTurbulence type="fractalNoise" baseFrequency="0.06" numOctaves="3" seed="${seed + 2}" result="n"/>
    <feDisplacementMap in="SourceGraphic" in2="n" scale="9" xChannelSelector="R" yChannelSelector="G" result="d"/>
    <feGaussianBlur in="SourceAlpha" stdDeviation="2" result="b"/>
    <feSpecularLighting in="n" surfaceScale="3" specularConstant="0.5" specularExponent="18" lighting-color="#ffffff" result="s">
      <feDistantLight azimuth="225" elevation="50"/>
    </feSpecularLighting>
    <feComposite in="s" in2="d" operator="in" result="s2"/>
    <feComposite in="d" in2="s2" operator="arithmetic" k1="0" k2="1" k3="0.35" k4="0"/>
  </filter>
  <filter id="crayon" x="-5%" y="-5%" width="110%" height="110%">
    <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="2" seed="${seed + 4}" result="g"/>
    <feColorMatrix in="g" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  3.2 0 0 0 -0.9" result="mask"/>
    <feComposite in="SourceGraphic" in2="mask" operator="in" result="c"/>
    <feDisplacementMap in="c" in2="g" scale="4" xChannelSelector="R" yChannelSelector="G"/>
  </filter>
  <filter id="grain" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" seed="${seed + 5}" stitchTiles="stitch"/>
    <feColorMatrix type="matrix" values="0 0 0 0 0.35  0 0 0 0 0.3  0 0 0 0 0.25  0 0 0 -1.2 0.75"/>
  </filter>
  <filter id="weave" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency="0.9 0.04" numOctaves="1" seed="${seed + 6}" result="a"/>
    <feTurbulence type="fractalNoise" baseFrequency="0.04 0.9" numOctaves="1" seed="${seed + 7}" result="b"/>
    <feBlend in="a" in2="b" mode="multiply" result="c"/>
    <feColorMatrix in="c" type="matrix" values="0 0 0 0 0.2  0 0 0 0 0.17  0 0 0 0 0.12  -1.6 0 0 0 0.9"/>
  </filter>
  <filter id="soft"><feGaussianBlur stdDeviation="1.2"/></filter>`;
}

const svgWrap = (w, h, seed, bg, body, overlay = 'grain', overlayOpacity = 0.35) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
<defs>${defs(seed)}</defs>
${bg ? `<rect width="${w}" height="${h}" fill="${bg}"/>` : ''}
${body}
${overlay ? `<rect width="${w}" height="${h}" filter="url(#${overlay})" opacity="${overlayOpacity}"/>` : ''}
</svg>`;

function hatch(k, box, angle, gap, colors, sw, op, len = 1) {
  const { R, P } = k;
  const cx = box.x + box.w / 2, cy = box.y + box.h / 2;
  const L = Math.hypot(box.w, box.h) * len;
  let s = '';
  for (let d = -L / 2; d < L / 2; d += gap * R(0.6, 1.4)) {
    const x1 = cx - L / 2 + R(-20, 20), x2 = cx + L / 2 + R(-20, 20);
    s += `<line x1="${f(x1)}" y1="${f(cy + d)}" x2="${f(x2)}" y2="${f(cy + d + R(-4, 4))}" stroke="${P(colors)}" stroke-width="${f(sw * R(0.6, 1.3))}" stroke-linecap="round" opacity="${f(op * R(0.5, 1))}"/>`;
  }
  return `<g transform="rotate(${f(angle)} ${f(cx)} ${f(cy)})">${s}</g>`;
}

function strokeField(k, w, h, colorAt, { step = 14, len = [50, 110], th = [14, 24], rot = 7, margin = 40 } = {}) {
  const { R, r } = k;
  let s = '';
  for (let y = -margin; y < h + margin; y += step) {
    for (let x = -margin; x < w + margin; x += R(len[0] * 0.45, len[0] * 0.9)) {
      const c = jitter(colorAt(x, y), r, 14);
      const L = R(len[0], len[1]), T = R(th[0], th[1]);
      s += `<rect x="${f(x)}" y="${f(y)}" width="${f(L)}" height="${f(T)}" rx="${f(T / 2)}" fill="${c}" transform="rotate(${f(R(-rot, rot))} ${f(x + L / 2)} ${f(y + T / 2)})"/>`;
    }
  }
  return s;
}

// ---------- obras ----------
const OBRAS = {
  acuarelaPaisaje(seed, pal) {
    const k = kit(seed); const { R, P } = k;
    const w = 1600, h = 1150;
    let b = '';
    for (let i = 0; i < 7; i++) b += `<ellipse cx="${f(R(0, w))}" cy="${f(R(0, h * 0.45))}" rx="${f(R(300, 700))}" ry="${f(R(90, 220))}" fill="${P(pal.cielo)}" opacity="${f(R(0.25, 0.45))}" filter="url(#wc)"/>`;
    b += `<circle cx="${f(R(w * 0.2, w * 0.8))}" cy="${f(R(h * 0.15, h * 0.3))}" r="${f(R(60, 100))}" fill="${pal.sol}" opacity="0.8" filter="url(#wc)"/>`;
    pal.montes.forEach((c, i) => {
      let base = h * (0.42 + i * 0.1);
      let pts = `-60,${f(h)} -60,${f(base)} `;
      for (let x = -60; x <= w + 60; x += R(70, 160)) pts += `${f(x)},${f(base + R(-150, 50) * (1 - i * 0.25))} `;
      pts += `${w + 60},${f(h)}`;
      b += `<polygon points="${pts}" fill="${c}" opacity="${f(0.5 + i * 0.1)}" filter="url(#wc)"/>`;
    });
    b += `<rect x="-60" y="${f(h * 0.74)}" width="${w + 120}" height="${f(h * 0.3)}" fill="${pal.agua}" opacity="0.55" filter="url(#wc)"/>`;
    for (let i = 0; i < 14; i++) { const y = R(h * 0.77, h * 0.97), x = R(0, w); b += `<line x1="${f(x)}" y1="${f(y)}" x2="${f(x + R(60, 220))}" y2="${f(y)}" stroke="#fff" stroke-width="${f(R(2, 6))}" opacity="0.55" stroke-linecap="round" filter="url(#rough)"/>`; }
    return { w, h, svg: svgWrap(w, h, seed, '#f7f1e6', b), color: pal.cielo[0] };
  },

  acuarelaFlores(seed, pal) {
    const k = kit(seed); const { R, P } = k;
    const w = 1200, h = 1600;
    let b = '';
    for (let i = 0; i < 5; i++) b += `<ellipse cx="${f(R(0, w))}" cy="${f(R(0, h))}" rx="${f(R(250, 500))}" ry="${f(R(200, 400))}" fill="${P(pal.fondo)}" opacity="0.18" filter="url(#wc)"/>`;
    const n = Math.round(R(5, 8));
    const heads = [];
    for (let i = 0; i < n; i++) {
      const hx = R(w * 0.18, w * 0.82), hy = R(h * 0.12, h * 0.55);
      heads.push([hx, hy]);
      const bx = w * 0.5 + R(-80, 80);
      b += `<path d="M${f(bx)},${f(h + 20)} Q${f((bx + hx) / 2 + R(-120, 120))},${f((h + hy) / 2)} ${f(hx)},${f(hy)}" stroke="${P(pal.tallo)}" stroke-width="${f(R(5, 9))}" fill="none" opacity="0.7" filter="url(#rough)"/>`;
      for (let l = 0; l < 2; l++) { const t = R(0.4, 0.8); const lx = bx + (hx - bx) * t, ly = h + (hy - h) * t; b += `<ellipse cx="${f(lx)}" cy="${f(ly)}" rx="${f(R(50, 90))}" ry="${f(R(16, 26))}" fill="${P(pal.tallo)}" opacity="0.5" transform="rotate(${f(R(-50, 50))} ${f(lx)} ${f(ly)})" filter="url(#wcEdge)"/>`; }
    }
    heads.forEach(([hx, hy]) => {
      const c = P(pal.flor), pet = Math.round(R(5, 8)), size = R(55, 105);
      let g = '';
      for (let p = 0; p < pet; p++) { const a = (p / pet) * 360 + R(-10, 10); g += `<ellipse cx="${f(hx)}" cy="${f(hy - size * 0.55)}" rx="${f(size * 0.42)}" ry="${f(size * 0.65)}" fill="${jitter(c, k.r, 20)}" opacity="0.5" transform="rotate(${f(a)} ${f(hx)} ${f(hy)})"/>`; }
      b += `<g filter="url(#wcEdge)">${g}</g><circle cx="${f(hx)}" cy="${f(hy)}" r="${f(size * 0.22)}" fill="${pal.centro}" opacity="0.85" filter="url(#wcEdge)"/>`;
    });
    return { w, h, svg: svgWrap(w, h, seed, '#f8f3ea', b), color: pal.flor[0] };
  },

  oleoMarina(seed, pal) {
    const k = kit(seed); const { R } = k;
    const w = 1600, h = 1100;
    const horizon = h * R(0.42, 0.55);
    const colorAt = (x, y) => (y < horizon ? ramp(pal.cielo, y / horizon) : ramp(pal.mar, (y - horizon) / (h - horizon)));
    let b = `<g filter="url(#impasto)">${strokeField(k, w, h, colorAt)}`;
    const sx = R(w * 0.3, w * 0.7), sy = horizon - R(80, 200);
    b += `<circle cx="${f(sx)}" cy="${f(sy)}" r="${f(R(45, 75))}" fill="${pal.sol}"/>`;
    for (let y = horizon + 6; y < h; y += 16) { const spread = 30 + (y - horizon) * 0.35; b += `<rect x="${f(sx - spread * R(0.2, 1))}" y="${f(y)}" width="${f(spread * R(0.5, 1.4))}" height="10" rx="5" fill="${jitter(pal.sol, k.r, 20)}" opacity="${f(R(0.5, 0.9))}"/>`; }
    const bx = R(w * 0.15, w * 0.75), by = horizon + R(40, 120);
    b += `<path d="M${f(bx)},${f(by)} l120,0 l-20,24 l-82,0 z" fill="#2a2235"/><path d="M${f(bx + 55)},${f(by - 2)} l0,-120 l50,110 z" fill="#f4ede0"/><path d="M${f(bx + 50)},${f(by - 2)} l0,-95 l-38,90 z" fill="#e8dcc6"/>`;
    b += `</g>`;
    return { w, h, svg: svgWrap(w, h, seed, pal.mar[0], b, 'weave', 0.5), color: pal.cielo[1] };
  },

  oleoBodegon(seed, pal) {
    const k = kit(seed); const { R, P } = k;
    const w = 1200, h = 1500;
    const mesa = h * 0.62;
    const colorAt = (x, y) => (y < mesa ? ramp(pal.fondo, (x / w) * 0.6 + (y / mesa) * 0.4) : ramp(pal.mesa, (y - mesa) / (h - mesa)));
    let b = `<g filter="url(#impasto)">${strokeField(k, w, h, colorAt, { step: 16, len: [40, 90], th: [16, 26], rot: 25 })}`;
    // jarrón
    const vx = R(w * 0.3, w * 0.45), vw = R(150, 210), vh = R(330, 420);
    b += `<defs><radialGradient id="gv" cx="35%" cy="35%" r="75%"><stop offset="0" stop-color="${mix(pal.jarron, '#ffffff', 0.45)}"/><stop offset="0.5" stop-color="${pal.jarron}"/><stop offset="1" stop-color="${mix(pal.jarron, '#000000', 0.55)}"/></radialGradient>`;
    b += `<radialGradient id="gf" cx="35%" cy="30%" r="75%"><stop offset="0" stop-color="#fff6d8" stop-opacity="0.9"/><stop offset="0.35" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.45"/></radialGradient></defs>`;
    // paño (detrás del jarrón y las frutas)
    b += `<path d="M-20,${f(mesa + 50)} q${f(w * 0.18)},-40 ${f(w * 0.36)},10 q${f(w * 0.08)},${f(h * 0.12)} ${f(-w * 0.02)},${f(h * 0.4)} L-20,${f(h + 20)} z" fill="${pal.pano}" opacity="0.8"/>`;
    b += `<ellipse cx="${f(vx)}" cy="${f(mesa + 30)}" rx="${f(vw * 0.8)}" ry="24" fill="#000" opacity="0.25"/>`;
    b += `<path d="M${f(vx - vw * 0.25)},${f(mesa - vh)} h${f(vw * 0.5)} q0,${f(vh * 0.18)} ${f(vw * 0.25)},${f(vh * 0.35)} q${f(vw * 0.35)},${f(vh * 0.3)} ${f(-vw * 0.05)},${f(vh * 0.65)} h${f(-vw * 0.9)} q${f(-vw * 0.4)},${f(-vh * 0.35)} ${f(-vw * 0.05)},${f(-vh * 0.65)} q${f(vw * 0.25)},${f(-vh * 0.17)} ${f(vw * 0.25)},${f(-vh * 0.35)} z" fill="url(#gv)"/>`;
    // frutas
    const nF = Math.round(R(3, 5));
    for (let i = 0; i < nF; i++) {
      const fx = vx + vw * 0.7 + i * R(90, 140), fy = mesa + R(10, 70), fr = R(55, 85), c = P(pal.frutas);
      b += `<ellipse cx="${f(fx)}" cy="${f(fy + fr * 0.85)}" rx="${f(fr * 1.1)}" ry="16" fill="#000" opacity="0.25"/>`;
      b += `<circle cx="${f(fx)}" cy="${f(fy)}" r="${f(fr)}" fill="${c}"/><circle cx="${f(fx)}" cy="${f(fy)}" r="${f(fr)}" fill="url(#gf)"/>`;
      b += `<path d="M${f(fx)},${f(fy - fr * 0.85)} q6,-26 18,-36" stroke="#4a3320" stroke-width="7" fill="none" stroke-linecap="round"/>`;
    }
    b += `</g>`;
    return { w, h, svg: svgWrap(w, h, seed, pal.fondo[0], b, 'weave', 0.5), color: pal.fondo[1] };
  },

  acrilicoAbstracto(seed, pal) {
    const k = kit(seed); const { R, P } = k;
    const w = 1400, h = 1400;
    let b = '';
    for (let i = 0; i < 5; i++) b += `<rect x="${f(R(-100, w))}" y="${f(R(-100, h))}" width="${f(R(200, 700))}" height="${f(R(200, 700))}" fill="${P(pal.c)}" opacity="${f(R(0.6, 1))}" transform="rotate(${f(R(-30, 30))} ${w / 2} ${h / 2})"/>`;
    for (let i = 0; i < 4; i++) {
      const cx = R(150, w - 150), cy = R(150, h - 150), rr = R(80, 260);
      for (let j = 4; j > 0; j--) b += `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f((rr * j) / 4)}" fill="${P(pal.c)}"/>`;
    }
    for (let i = 0; i < 9; i++) b += `<line x1="${f(R(0, w))}" y1="${f(R(0, h))}" x2="${f(R(0, w))}" y2="${f(R(0, h))}" stroke="${P(pal.lineas)}" stroke-width="${f(R(6, 22))}" stroke-linecap="round"/>`;
    for (let i = 0; i < 4; i++) { const x = R(0, w), y = R(0, h), s = R(80, 200); b += `<path d="M${f(x)},${f(y)} l${f(s)},${f(-s * 1.4)} l${f(s)},${f(s * 1.4)} z" fill="${P(pal.c)}"/>`; }
    for (let i = 0; i < 3; i++) { const x = R(0, w), y = R(0, h), s = R(80, 200); b += `<path d="M${f(x - s)},${f(y)} a${f(s)},${f(s)} 0 0 1 ${f(2 * s)},0 z" fill="${P(pal.c)}"/>`; }
    const gx = R(100, w - 400), gy = R(100, h - 400);
    for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) if ((i + j) % 2 === 0) b += `<rect x="${f(gx + i * 50)}" y="${f(gy + j * 50)}" width="50" height="50" fill="${pal.lineas[0]}"/>`;
    for (let i = 0; i < 40; i++) b += `<circle cx="${f(R(0, w))}" cy="${f(R(0, h))}" r="${f(R(4, 14))}" fill="${P(pal.lineas)}"/>`;
    return { w, h, svg: svgWrap(w, h, seed, pal.fondo, `<g filter="url(#rough)">${b}</g>`, 'weave', 0.45), color: pal.c[0] };
  },

  acrilicoCiudad(seed, pal) {
    const k = kit(seed); const { R, r } = k;
    const w = 1600, h = 1050;
    let b = `<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">${pal.cielo.map((c, i) => `<stop offset="${f(i / (pal.cielo.length - 1))}" stop-color="${c}"/>`).join('')}</linearGradient></defs>`;
    b += `<rect width="${w}" height="${h}" fill="url(#sky)"/>`;
    b += `<circle cx="${f(R(w * 0.3, w * 0.7))}" cy="${f(h * 0.55)}" r="${f(R(110, 160))}" fill="${pal.sol}" opacity="0.95"/>`;
    for (let i = 0; i < 6; i++) b += `<rect x="${f(R(-100, w))}" y="${f(R(h * 0.1, h * 0.45))}" width="${f(R(200, 500))}" height="${f(R(8, 22))}" rx="10" fill="${pal.nubes}" opacity="0.6"/>`;
    for (const [layer, col] of [[0, pal.edif[0]], [1, pal.edif[1]]]) {
      let x = -20;
      while (x < w) {
        const bw = R(70, 160), bh = R(h * (0.2 + layer * 0.05), h * (0.55 - layer * 0.12));
        const y = h - bh - (layer === 0 ? 40 : 0);
        b += `<rect x="${f(x)}" y="${f(y)}" width="${f(bw)}" height="${f(bh + 60)}" fill="${col}"/>`;
        if (layer === 1) for (let wy = y + 20; wy < h - 30; wy += 34) for (let wx = x + 14; wx < x + bw - 20; wx += 28) if (r() < 0.35) b += `<rect x="${f(wx)}" y="${f(wy)}" width="12" height="16" fill="${pal.ventana}" opacity="${f(R(0.6, 1))}"/>`;
        x += bw + R(-10, 10);
      }
    }
    return { w, h, svg: svgWrap(w, h, seed, null, `<g filter="url(#rough)">${b}</g>`, 'weave', 0.4), color: pal.cielo[1] };
  },

  pastelGirasoles(seed, pal) {
    const k = kit(seed); const { R, P } = k;
    const w = 1400, h = 1400;
    let bg = '';
    for (let i = 0; i < 900; i++) { const x = R(-50, w), y = R(-50, h), a = R(0, Math.PI); bg += `<line x1="${f(x)}" y1="${f(y)}" x2="${f(x + Math.cos(a) * R(30, 80))}" y2="${f(y + Math.sin(a) * R(30, 80))}" stroke="${P(pal.fondo)}" stroke-width="${f(R(10, 22))}" stroke-linecap="round"/>`; }
    let b = `<g filter="url(#crayon)">${bg}</g>`;
    const vx = w * 0.5, vy = h * 0.68;
    let vase = `<path d="M${f(vx - 150)},${f(vy)} q-20,220 60,330 h180 q80,-110 60,-330 z" fill="${pal.jarron}"/>`;
    for (let i = 0; i < 60; i++) vase += `<line x1="${f(vx - 140 + i * 5)}" y1="${f(vy + 10)}" x2="${f(vx - 140 + i * 5 + R(-10, 10))}" y2="${f(vy + 320)}" stroke="${jitter(pal.jarron, k.r, 30)}" stroke-width="6"/>`;
    let flores = '';
    const n = Math.round(R(4, 6));
    for (let i = 0; i < n; i++) {
      const fx = vx + R(-380, 380), fy = R(h * 0.18, h * 0.5), s = R(85, 135);
      flores += `<path d="M${f(vx + R(-40, 40))},${f(vy + 10)} Q${f((vx + fx) / 2)},${f(fy + 200)} ${f(fx)},${f(fy)}" stroke="${pal.tallo}" stroke-width="12" fill="none"/>`;
      const pet = Math.round(R(13, 18));
      for (let p = 0; p < pet; p++) { const a = (p / pet) * 360 + R(-6, 6); flores += `<ellipse cx="${f(fx)}" cy="${f(fy - s * 0.75)}" rx="${f(s * 0.2)}" ry="${f(s * 0.5)}" fill="${P(pal.petalo)}" transform="rotate(${f(a)} ${f(fx)} ${f(fy)})"/>`; }
      flores += `<circle cx="${f(fx)}" cy="${f(fy)}" r="${f(s * 0.42)}" fill="${pal.centro}"/>`;
      for (let d = 0; d < 30; d++) { const a = R(0, 6.28), rr = R(0, s * 0.38); flores += `<circle cx="${f(fx + Math.cos(a) * rr)}" cy="${f(fy + Math.sin(a) * rr)}" r="${f(R(4, 9))}" fill="${mix(pal.centro, '#000', 0.4)}"/>`; }
    }
    b += `<g filter="url(#crayon)">${flores}${vase}</g>`;
    return { w, h, svg: svgWrap(w, h, seed, pal.papel, b), color: pal.petalo[0] };
  },

  pastelNoche(seed, pal) {
    const k = kit(seed); const { R, P } = k;
    const w = 1600, h = 1100;
    let s = '';
    for (let i = 0; i < 260; i++) {
      const cx = R(0, w), cy = R(0, h * 0.7), rr = R(30, 160), a0 = R(0, 6.28), a1 = a0 + R(0.8, 2.2);
      s += `<path d="M${f(cx + Math.cos(a0) * rr)},${f(cy + Math.sin(a0) * rr)} A${f(rr)},${f(rr)} 0 0 1 ${f(cx + Math.cos(a1) * rr)},${f(cy + Math.sin(a1) * rr)}" stroke="${P(pal.cielo)}" stroke-width="${f(R(10, 24))}" fill="none" stroke-linecap="round"/>`;
    }
    const mx = R(w * 0.6, w * 0.85), my = R(h * 0.15, h * 0.28);
    for (let i = 4; i > 0; i--) s += `<circle cx="${f(mx)}" cy="${f(my)}" r="${f(55 + i * 26)}" fill="none" stroke="${pal.luna}" stroke-width="10" opacity="${f(0.15 + 0.12 * (4 - i))}"/>`;
    s += `<circle cx="${f(mx)}" cy="${f(my)}" r="60" fill="${pal.luna}"/>`;
    for (let i = 0; i < 12; i++) { const x = R(0, w), y = R(0, h * 0.55), rr = R(6, 14); s += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(rr)}" fill="${pal.luna}"/><circle cx="${f(x)}" cy="${f(y)}" r="${f(rr * 2.4)}" fill="none" stroke="${pal.luna}" stroke-width="5" opacity="0.4"/>`; }
    let hills = '';
    pal.cerros.forEach((c, i) => {
      const base = h * (0.66 + i * 0.1);
      let d = `M-40,${f(h + 40)} L-40,${f(base)} `;
      for (let x = -40; x <= w + 80; x += 200) d += `Q${f(x + 100)},${f(base - R(30, 120))} ${f(x + 200)},${f(base + R(-20, 20))} `;
      d += `L${w + 40},${f(h + 40)} z`;
      hills += `<path d="${d}" fill="${c}"/>`;
    });
    for (let i = 0; i < 7; i++) { const x = R(40, w - 80), y = h * R(0.78, 0.88), s2 = R(40, 64); hills += `<rect x="${f(x)}" y="${f(y)}" width="${f(s2)}" height="${f(s2 * 0.8)}" fill="${P(pal.casas)}"/><path d="M${f(x - 8)},${f(y)} l${f(s2 / 2 + 8)},${f(-s2 * 0.55)} l${f(s2 / 2 + 8)},${f(s2 * 0.55)} z" fill="${mix(P(pal.casas), '#000', 0.35)}"/><rect x="${f(x + s2 * 0.35)}" y="${f(y + s2 * 0.3)}" width="${f(s2 * 0.25)}" height="${f(s2 * 0.25)}" fill="${pal.luna}"/>`; }
    return { w, h, svg: svgWrap(w, h, seed, pal.cielo[0], `<g filter="url(#crayon)">${s}${hills}</g>`), color: pal.cielo[1] };
  },

  grafitoVolumenes(seed) {
    const k = kit(seed); const { R } = k;
    const w = 1400, h = 1100;
    const g = ['#2b2b2b', '#3a3a3a', '#555555', '#6d6d6d'];
    let b = `<defs><radialGradient id="esf" cx="35%" cy="32%" r="70%"><stop offset="0" stop-color="#f4f1ea"/><stop offset="0.45" stop-color="#b9b6ae"/><stop offset="0.8" stop-color="#55534f"/><stop offset="1" stop-color="#8a8780"/></radialGradient>
      <radialGradient id="sombra" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#2a2a2a" stop-opacity="0.7"/><stop offset="1" stop-color="#2a2a2a" stop-opacity="0"/></radialGradient>
      <clipPath id="cEsf"><circle cx="460" cy="560" r="230"/></clipPath>
      <clipPath id="cSh"><path d="M460,330 a230,230 0 0 1 0,460 a160,230 0 0 0 0,-460 z"/></clipPath></defs>`;
    b += hatch(k, { x: 0, y: 0, w, h }, -12, 22, ['#9a978f'], 1.2, 0.35);
    b += `<line x1="0" y1="${f(h * 0.74)}" x2="${w}" y2="${f(h * 0.72)}" stroke="#777" stroke-width="2" opacity="0.6" filter="url(#rough)"/>`;
    b += `<ellipse cx="560" cy="800" rx="290" ry="55" fill="url(#sombra)"/>`;
    b += `<circle cx="460" cy="560" r="230" fill="url(#esf)"/>`;
    b += `<g clip-path="url(#cEsf)">${hatch(k, { x: 230, y: 330, w: 460, h: 460 }, 35, 7, g, 1.4, 0.35)}</g>`;
    b += `<g clip-path="url(#cSh)">${hatch(k, { x: 230, y: 330, w: 460, h: 460 }, -30, 6, g, 1.6, 0.55)}</g>`;
    b += `<circle cx="460" cy="560" r="230" fill="none" stroke="#333" stroke-width="2" opacity="0.6" filter="url(#rough)"/>`;
    // cubo
    const cx = 930, cy = 520, s = 210;
    const top = `${cx},${cy} ${cx + s},${cy - 70} ${cx + s * 1.6},${cy} ${cx + s * 0.6},${cy + 70}`;
    const left = `${cx},${cy} ${cx + s * 0.6},${cy + 70} ${cx + s * 0.6},${cy + 70 + s} ${cx},${cy + s}`;
    const right = `${cx + s * 0.6},${cy + 70} ${cx + s * 1.6},${cy} ${cx + s * 1.6},${cy + s} ${cx + s * 0.6},${cy + 70 + s}`;
    b += `<polygon points="${cx + s * 0.6},${cy + 70 + s} ${cx + s * 1.6},${cy + s} ${cx + s * 2.3},${cy + s + 60} ${cx + s * 1.2},${cy + s + 120}" fill="url(#sombra)"/>`;
    b += `<polygon points="${top}" fill="#e9e6df"/><polygon points="${left}" fill="#a4a19a"/><polygon points="${right}" fill="#6a6862"/>`;
    b += `<defs><clipPath id="cR"><polygon points="${right}"/></clipPath><clipPath id="cL"><polygon points="${left}"/></clipPath></defs>`;
    b += `<g clip-path="url(#cR)">${hatch(k, { x: cx + s * 0.6, y: cy - 70, w: s, h: s + 140 }, 60, 6, g, 1.5, 0.5)}</g>`;
    b += `<g clip-path="url(#cL)">${hatch(k, { x: cx, y: cy, w: s * 0.6, h: s + 70 }, -20, 9, g, 1.2, 0.35)}</g>`;
    b += `<g fill="none" stroke="#2c2c2c" stroke-width="2.2" opacity="0.7" filter="url(#rough)"><polygon points="${top}"/><polygon points="${left}"/><polygon points="${right}"/></g>`;
    for (let i = 0; i < 6; i++) b += `<line x1="${f(R(0, w))}" y1="${f(R(0, h))}" x2="${f(R(0, w))}" y2="${f(R(0, h))}" stroke="#999" stroke-width="1" opacity="0.35"/>`;
    return { w, h, svg: svgWrap(w, h, seed, '#f3efe6', b), color: '#b9b6ae' };
  },

  grafitoArbol(seed) {
    const k = kit(seed); const { R } = k;
    const w = 1100, h = 1400;
    let lines = '', leaves = '';
    const branch = (x, y, a, len, wd, d) => {
      const x2 = x + Math.cos(a) * len, y2 = y + Math.sin(a) * len;
      lines += `<path d="M${f(x)},${f(y)} Q${f((x + x2) / 2 + R(-15, 15))},${f((y + y2) / 2 + R(-15, 15))} ${f(x2)},${f(y2)}" stroke="#2e2e2e" stroke-width="${f(wd)}" fill="none" stroke-linecap="round" opacity="0.85"/>`;
      if (d <= 0 || len < 18) {
        for (let i = 0; i < 6; i++) { const lx = x2 + R(-40, 40), ly = y2 + R(-40, 40), rr = R(8, 22); leaves += `<path d="M${f(lx)},${f(ly)} c${f(rr)},${f(-rr)} ${f(rr * 2)},${f(rr)} ${f(0)},${f(rr)} c${f(-rr)},0 ${f(-rr)},${f(-rr * 1.5)} ${f(rr * 0.5)},${f(-rr * 1.2)}" stroke="#3b3b3b" stroke-width="1.4" fill="none" opacity="0.45"/>`; }
        return;
      }
      const n = d > 4 ? 2 : Math.round(R(2, 3));
      for (let i = 0; i < n; i++) branch(x2, y2, a + R(-0.6, 0.6), len * R(0.65, 0.8), wd * 0.68, d - 1);
    };
    branch(w / 2, h * 0.88, -Math.PI / 2, 260, 34, 7);
    let b = hatch(k, { x: 0, y: h * 0.84, w, h: h * 0.16 }, 4, 9, ['#555', '#777'], 1.3, 0.5, 0.9);
    b += `<g filter="url(#rough)">${lines}${leaves}</g>`;
    b += `<ellipse cx="${w / 2}" cy="${f(h * 0.9)}" rx="260" ry="28" fill="#555" opacity="0.18" filter="url(#soft)"/>`;
    return { w, h, svg: svgWrap(w, h, seed, '#f4f0e7', b), color: '#9a978f' };
  },

  lapicesFrutas(seed, pal) {
    const k = kit(seed); const { R } = k;
    const w = 1400, h = 1050;
    let b = hatch(k, { x: 0, y: h * 0.6, w, h: h * 0.4 }, 8, 10, pal.mantel, 2, 0.45);
    const n = 3;
    for (let i = 0; i < n; i++) {
      const cx = w * (0.28 + i * 0.22) + R(-30, 30), cy = h * 0.55 + R(-20, 30), rr = R(120, 160);
      const id = `m${i}`;
      const d = `M${f(cx)},${f(cy - rr * 0.75)} C${f(cx + rr * 0.6)},${f(cy - rr * 1.15)} ${f(cx + rr * 1.25)},${f(cy - rr * 0.4)} ${f(cx + rr * 0.95)},${f(cy + rr * 0.45)} C${f(cx + rr * 0.7)},${f(cy + rr * 1.05)} ${f(cx + rr * 0.15)},${f(cy + rr * 0.95)} ${f(cx)},${f(cy + rr * 0.85)} C${f(cx - rr * 0.15)},${f(cy + rr * 0.95)} ${f(cx - rr * 0.7)},${f(cy + rr * 1.05)} ${f(cx - rr * 0.95)},${f(cy + rr * 0.45)} C${f(cx - rr * 1.25)},${f(cy - rr * 0.4)} ${f(cx - rr * 0.6)},${f(cy - rr * 1.15)} ${f(cx)},${f(cy - rr * 0.75)} z`;
      const cols = pal.frutas[i % pal.frutas.length];
      b += `<ellipse cx="${f(cx + 40)}" cy="${f(cy + rr * 0.9)}" rx="${f(rr * 1.1)}" ry="${f(rr * 0.18)}" fill="#444" opacity="0.25" filter="url(#soft)"/>`;
      b += `<defs><clipPath id="${id}"><path d="${d}"/></clipPath></defs><g clip-path="url(#${id})">`;
      b += hatch(k, { x: cx - rr * 1.3, y: cy - rr * 1.2, w: rr * 2.6, h: rr * 2.4 }, 40, 6, cols, 3, 0.7);
      b += hatch(k, { x: cx - rr * 1.3, y: cy - rr * 1.2, w: rr * 2.6, h: rr * 2.4 }, -35, 9, cols, 2.5, 0.5);
      b += `<circle cx="${f(cx + rr * 0.6)}" cy="${f(cy + rr * 0.4)}" r="${f(rr * 0.8)}" fill="#3a1a1a" opacity="0.18" filter="url(#soft)"/>`;
      b += `<ellipse cx="${f(cx - rr * 0.4)}" cy="${f(cy - rr * 0.3)}" rx="${f(rr * 0.22)}" ry="${f(rr * 0.12)}" fill="#fffbee" opacity="0.8" filter="url(#soft)"/></g>`;
      b += `<path d="${d}" fill="none" stroke="${mix(cols[0], '#000', 0.4)}" stroke-width="2" opacity="0.6"/>`;
      b += `<path d="M${f(cx)},${f(cy - rr * 0.7)} q4,-40 20,-60" stroke="#5a3a1e" stroke-width="7" fill="none" stroke-linecap="round"/>`;
      b += `<path d="M${f(cx + 16)},${f(cy - rr * 0.95)} q50,-40 95,-10 q-50,35 -95,10 z" fill="none" stroke="#3f7a35" stroke-width="3"/>`;
      b += `<g opacity="0.8">${hatch(k, { x: cx + 16, y: cy - rr * 1.15, w: 95, h: 40 }, -15, 5, ['#4d8f3a', '#7bb04f'], 2, 0.6, 0.4)}</g>`;
    }
    return { w, h, svg: svgWrap(w, h, seed, '#f6f2e9', `<g filter="url(#rough)">${b}</g>`), color: pal.frutas[0][0] };
  },

  lapicesMariposa(seed, pal) {
    const k = kit(seed); const { R, P } = k;
    const w = 1200, h = 1200, cx = w / 2, cy = h / 2;
    const wingTop = `M${cx},${cy - 20} C${cx + 120},${cy - 380} ${cx + 480},${cy - 360} ${cx + 430},${cy - 120} C${cx + 400},${cy + 10} ${cx + 160},${cy + 20} ${cx},${cy + 10} z`;
    const wingBot = `M${cx},${cy + 10} C${cx + 160},${cy + 30} ${cx + 380},${cy + 120} ${cx + 300},${cy + 300} C${cx + 230},${cy + 420} ${cx + 60},${cy + 260} ${cx},${cy + 60} z`;
    let wing = `<defs><clipPath id="wt"><path d="${wingTop}"/></clipPath><clipPath id="wb"><path d="${wingBot}"/></clipPath></defs>`;
    wing += `<g clip-path="url(#wt)">${hatch(k, { x: cx, y: cy - 380, w: 480, h: 400 }, 30, 6, pal.alas, 3, 0.75)}${hatch(k, { x: cx, y: cy - 380, w: 480, h: 400 }, -40, 10, pal.alas2, 2.5, 0.5)}</g>`;
    wing += `<g clip-path="url(#wb)">${hatch(k, { x: cx, y: cy, w: 380, h: 420 }, -30, 6, pal.alas2, 3, 0.75)}${hatch(k, { x: cx, y: cy, w: 380, h: 420 }, 50, 10, pal.alas, 2.5, 0.5)}</g>`;
    wing += `<path d="${wingTop}" fill="none" stroke="#2b2030" stroke-width="10"/><path d="${wingBot}" fill="none" stroke="#2b2030" stroke-width="10"/>`;
    for (let i = 0; i < 7; i++) wing += `<circle cx="${f(cx + R(120, 380))}" cy="${f(cy + R(-280, -60))}" r="${f(R(12, 34))}" fill="${P(pal.puntos)}" stroke="#2b2030" stroke-width="4"/>`;
    for (let i = 0; i < 4; i++) wing += `<circle cx="${f(cx + R(80, 260))}" cy="${f(cy + R(60, 260))}" r="${f(R(10, 26))}" fill="${P(pal.puntos)}" stroke="#2b2030" stroke-width="4"/>`;
    let b = hatch(k, { x: 0, y: 0, w, h }, 70, 26, pal.fondo, 2, 0.25);
    b += `<g>${wing}</g><g transform="translate(${w},0) scale(-1,1)">${wing}</g>`;
    b += `<ellipse cx="${cx}" cy="${cy + 40}" rx="22" ry="190" fill="#2b2030"/><circle cx="${cx}" cy="${cy - 170}" r="34" fill="#2b2030"/>`;
    b += `<path d="M${cx - 10},${cy - 200} q-60,-120 -130,-140 M${cx + 10},${cy - 200} q60,-120 130,-140" stroke="#2b2030" stroke-width="6" fill="none"/>`;
    return { w, h, svg: svgWrap(w, h, seed, '#f7f3ea', `<g filter="url(#rough)">${b}</g>`), color: pal.alas[0] };
  },

  ceraOleoCasa(seed, pal) {
    const k = kit(seed); const { R, P } = k;
    const w = 1500, h = 1100;
    let s = '';
    for (let y = -20; y < h * 0.66; y += 16) s += `<path d="M-20,${f(y)} Q${f(w / 2)},${f(y + R(-25, 25))} ${w + 20},${f(y + R(-10, 10))}" stroke="${P(pal.cielo)}" stroke-width="${f(R(14, 24))}" fill="none"/>`;
    for (let y = h * 0.62; y < h + 20; y += 14) s += `<path d="M-20,${f(y)} Q${f(w / 2)},${f(y + R(-30, 30))} ${w + 20},${f(y)}" stroke="${P(pal.pasto)}" stroke-width="${f(R(14, 24))}" fill="none"/>`;
    const sx = R(120, 300), sy = R(110, 200);
    for (let i = 0; i < 12; i++) { const a = (i / 12) * 6.28; s += `<line x1="${f(sx + Math.cos(a) * 110)}" y1="${f(sy + Math.sin(a) * 110)}" x2="${f(sx + Math.cos(a) * 175)}" y2="${f(sy + Math.sin(a) * 175)}" stroke="${pal.sol}" stroke-width="16" stroke-linecap="round"/>`; }
    s += `<circle cx="${f(sx)}" cy="${f(sy)}" r="90" fill="${pal.sol}"/>`;
    const hx = R(w * 0.4, w * 0.55), hy = h * 0.42, hw = 380, hh = 300;
    s += `<rect x="${f(hx)}" y="${f(hy)}" width="${hw}" height="${hh}" fill="${pal.casa}"/>`;
    s += `<path d="M${f(hx - 40)},${f(hy)} L${f(hx + hw / 2)},${f(hy - 200)} L${f(hx + hw + 40)},${f(hy)} z" fill="${pal.techo}"/>`;
    s += `<rect x="${f(hx + 150)}" y="${f(hy + 140)}" width="90" height="160" fill="${pal.puerta}"/><circle cx="${f(hx + 220)}" cy="${f(hy + 225)}" r="8" fill="#ffd84a"/>`;
    for (const wx of [hx + 40, hx + 270]) s += `<rect x="${f(wx)}" y="${f(hy + 60)}" width="80" height="80" fill="#bfe6ff" stroke="#3a2a1a" stroke-width="8"/><path d="M${f(wx + 40)},${f(hy + 60)} v80 M${f(wx)},${f(hy + 100)} h80" stroke="#3a2a1a" stroke-width="6"/>`;
    const tx = R(w * 0.75, w * 0.88);
    s += `<rect x="${f(tx)}" y="${f(h * 0.4)}" width="50" height="${f(h * 0.3)}" fill="#7a4a24"/>`;
    for (let i = 0; i < 7; i++) s += `<circle cx="${f(tx + 25 + R(-110, 110))}" cy="${f(h * 0.33 + R(-90, 60))}" r="${f(R(60, 95))}" fill="${P(pal.pasto)}"/>`;
    for (let i = 0; i < 9; i++) { const fx = R(40, w - 40), fy = R(h * 0.75, h * 0.95), c = P(pal.flores); s += `<line x1="${f(fx)}" y1="${f(fy)}" x2="${f(fx)}" y2="${f(fy + 60)}" stroke="#2f7d32" stroke-width="7"/>`; for (let p = 0; p < 5; p++) { const a = (p / 5) * 6.28; s += `<circle cx="${f(fx + Math.cos(a) * 18)}" cy="${f(fy + Math.sin(a) * 18)}" r="15" fill="${c}"/>`; } s += `<circle cx="${f(fx)}" cy="${f(fy)}" r="11" fill="#ffd84a"/>`; }
    for (let i = 0; i < 3; i++) { const x = R(w * 0.3, w * 0.9), y = R(60, 220); s += `<path d="M${f(x)},${f(y)} q25,-30 50,0 q25,-30 50,0" stroke="#333" stroke-width="7" fill="none" stroke-linecap="round"/>`; }
    return { w, h, svg: svgWrap(w, h, seed, '#fbf7ee', `<g filter="url(#crayon)">${s}</g>`), color: pal.cielo[0] };
  },

  ceraOleoPeces(seed, pal) {
    const k = kit(seed); const { R, P } = k;
    const w = 1400, h = 1100;
    let s = '';
    for (let y = -20; y < h + 20; y += 15) s += `<path d="M-20,${f(y)} q175,${f(R(-30, 30))} 350,0 t350,0 t350,0 t400,0" stroke="${P(pal.mar)}" stroke-width="${f(R(14, 22))}" fill="none"/>`;
    for (let i = 0; i < 8; i++) { const x = R(0, w); s += `<path d="M${f(x)},${h + 10} q-40,-80 0,-160 t0,-160 t0,-${f(R(40, 140))}" stroke="${P(pal.algas)}" stroke-width="18" fill="none" stroke-linecap="round"/>`; }
    const n = Math.round(R(3, 5));
    for (let i = 0; i < n; i++) {
      const fx = R(200, w - 300), fy = R(180, h - 250), sc = R(0.7, 1.25), c = P(pal.peces), dir = k.r() < 0.5 ? 1 : -1;
      let fish = `<ellipse cx="0" cy="0" rx="150" ry="85" fill="${c}"/><path d="M130,0 l110,-80 l-20,80 l20,80 z" fill="${mix(c, '#000', 0.2)}"/>`;
      for (let r2 = -60; r2 <= 60; r2 += 40) for (let q = -80; q < 100; q += 45) fish += `<path d="M${q},${r2} q22,20 0,40" stroke="${mix(c, '#000', 0.35)}" stroke-width="7" fill="none"/>`;
      fish += `<circle cx="-90" cy="-20" r="22" fill="#fff"/><circle cx="-95" cy="-20" r="11" fill="#111"/><path d="M-148,10 q15,12 30,2" stroke="#111" stroke-width="6" fill="none"/>`;
      s += `<g transform="translate(${f(fx)} ${f(fy)}) scale(${f(sc * dir)} ${f(sc)})">${fish}</g>`;
    }
    for (let i = 0; i < 26; i++) s += `<circle cx="${f(R(0, w))}" cy="${f(R(0, h))}" r="${f(R(8, 22))}" fill="none" stroke="#e8f8ff" stroke-width="6"/>`;
    for (let i = 0; i < 6; i++) { const x = R(0, w); s += `<path d="M${f(x)},${h} l30,-60 l30,60 z" fill="${P(pal.peces)}"/>`; }
    return { w, h, svg: svgWrap(w, h, seed, pal.mar[0], `<g filter="url(#crayon)">${s}</g>`), color: pal.mar[1] };
  },
};

// ---------- catálogo de ejemplo ----------
const PAL = {
  atardecer: { cielo: ['#f2a7a0', '#f6c58a', '#c9b8e8', '#9fc3e8'], sol: '#ffcf6b', montes: ['#8e7cc3', '#5d6fb0', '#2f4a7a'], agua: '#6fa7c9' },
  verde: { cielo: ['#a8d5e2', '#d9ecd0', '#f4e3b5'], sol: '#fff1b0', montes: ['#9cc59a', '#5f9e6e', '#2f6b4f'], agua: '#7fb7b0' },
  floresRosa: { fondo: ['#f3c6d3', '#cfe3f3', '#f7e2b5'], tallo: ['#5f9e6e', '#3f7a52'], flor: ['#e2557a', '#f08aa5', '#c43d6b', '#f3a35f'], centro: '#f2b632' },
  floresAzul: { fondo: ['#c8d8f0', '#e8d6f3'], tallo: ['#6a9b5a', '#2f6b4f'], flor: ['#5a6fd1', '#8b7be0', '#3f94c9', '#b4a4f0'], centro: '#f6d36b' },
  marinaDorada: { cielo: ['#f6d27a', '#f3a65e', '#d9707a', '#7e6aa8'], mar: ['#5b5aa0', '#2e4a7d', '#1b2e55'], sol: '#fff0b8' },
  marinaAzul: { cielo: ['#cfe6f6', '#9ccbe8', '#f2d7b6'], mar: ['#3e8fb8', '#1f6696', '#0f3d63'], sol: '#fff7d6' },
  bodegonCalido: { fondo: ['#3b2a2a', '#5e3b2c', '#7a4e2f', '#4a3a4d'], mesa: ['#8a5a32', '#5a3a20'], jarron: '#2f6f8f', frutas: ['#d1352f', '#f0a12b', '#e8c13b', '#8fb23a'], pano: '#efe6d2' },
  bodegonVerde: { fondo: ['#26403a', '#3f5f4f', '#6a7d5a', '#2a3b45'], mesa: ['#a0764a', '#6b4a2c'], jarron: '#c0503f', frutas: ['#e9b12e', '#e6672d', '#b9283a'], pano: '#e3d7c3' },
  pop: { fondo: '#f4ead5', c: ['#e63946', '#f4a261', '#2a9d8f', '#264653', '#e9c46a', '#6d4fd1'], lineas: ['#1d1d1d', '#ffffff'] },
  pastelPop: { fondo: '#fbe8e6', c: ['#ff8fab', '#ffd166', '#06d6a0', '#118ab2', '#9b5de5', '#f15bb5'], lineas: ['#073b4c', '#ffffff'] },
  ciudadAtardecer: { cielo: ['#2b1e5a', '#7b3f8c', '#e0607e', '#f6b26b'], sol: '#ffd27a', nubes: '#ffc2a8', edif: ['#4b3470', '#22163d'], ventana: '#ffd97a' },
  girasol: { papel: '#1f2a5a', fondo: ['#2d4a9a', '#3b62c4', '#1d3277', '#5a7fe0'], jarron: '#c8562d', tallo: '#3f8a3a', petalo: ['#ffcc33', '#ffb21f', '#ffe066'], centro: '#6b3b1d' },
  girasolClaro: { papel: '#f3e3c0', fondo: ['#8fc1e3', '#b6dbf2', '#e8c99a', '#7fb0d9'], jarron: '#3d6ea8', tallo: '#4d8f3a', petalo: ['#f7b733', '#fc9d2b', '#ffd25e'], centro: '#5a3215' },
  noche: { cielo: ['#14205a', '#1f3c8c', '#2f5dbd', '#4c7fe0', '#a7c7ff'], luna: '#ffe27a', cerros: ['#1b3b3a', '#0e2424'], casas: ['#c75b3d', '#e5a23a', '#8b6bbf'] },
  frutasRojas: { mantel: ['#9cc0e0', '#c6dbee'], frutas: [['#d22b2b', '#f05a3a', '#9e1b2a', '#f2b33a'], ['#f2c43a', '#e9922b', '#b9d14a'], ['#7fbf3a', '#4c9a2a', '#e5d34a']] },
  frutasMoradas: { mantel: ['#e7c7a0', '#f1dcc0'], frutas: [['#8a3fa8', '#5a2a7a', '#c45ab8'], ['#e85d3a', '#f2a03a', '#c2263a'], ['#d22b2b', '#f05a3a', '#9e1b2a']] },
  mariposaAzul: { fondo: ['#cfe3c6', '#e9f1d8'], alas: ['#2d6fd6', '#45a3e6', '#1c3f9a'], alas2: ['#7b4fd6', '#3cc0c9', '#2d6fd6'], puntos: ['#ffd23f', '#ffffff', '#ff7a59'] },
  mariposaNaranja: { fondo: ['#f3e1c7', '#efd0b0'], alas: ['#f08a24', '#f5b02c', '#d9531e'], alas2: ['#e2401c', '#f5b02c', '#a82c1a'], puntos: ['#ffffff', '#2b2030', '#ffe066'] },
  casaFeliz: { cielo: ['#6ec3f4', '#8fd3ff', '#4aa8e8'], pasto: ['#58b947', '#3e9b33', '#7fd35c'], sol: '#ffcf1f', casa: '#f26b5b', techo: '#8b3a2b', puerta: '#6b3fa0', flores: ['#ff4f8b', '#ffffff', '#ff9a1f', '#a45cff'] },
  casaAtardecer: { cielo: ['#ff9f6e', '#ffc36e', '#ff7f8a'], pasto: ['#4fa34a', '#2f8a3a', '#7cc95a'], sol: '#fff176', casa: '#4c8fd6', techo: '#d63a3a', puerta: '#ffd23f', flores: ['#ff4f8b', '#ffffff', '#c94cff'] },
  mar: { mar: ['#1f7fc4', '#2a96d8', '#1a64a8', '#39a9e0'], algas: ['#2f9e5a', '#46b86b'], peces: ['#ff7a1f', '#ffd23f', '#ff4f8b', '#a45cff', '#3fe0b0'] },
};

const CATALOGO = [
  { fn: 'acuarelaPaisaje', seed: 11, pal: PAL.atardecer, titulo: 'Atardecer en la cordillera', alumno: 'Martina', edad: 34, tecnica: 'acuarela', exposicion: true },
  { fn: 'ceraOleoCasa', seed: 21, pal: PAL.casaFeliz, titulo: 'Mi casa con sol', alumno: 'Lucas', edad: 6, tecnica: 'cera-oleo' },
  { fn: 'oleoMarina', seed: 31, pal: PAL.marinaDorada, titulo: 'Velero al anochecer', alumno: 'Ignacio', edad: 45, tecnica: 'oleo', exposicion: true },
  { fn: 'lapicesMariposa', seed: 41, pal: PAL.mariposaAzul, titulo: 'Mariposa azul', alumno: 'Isidora', edad: 8, tecnica: 'lapices-colores' },
  { fn: 'pastelGirasoles', seed: 51, pal: PAL.girasol, titulo: 'Girasoles de noche', alumno: 'Valentina', edad: 16, tecnica: 'cera-pastel', exposicion: true },
  { fn: 'grafitoVolumenes', seed: 61, titulo: 'Estudio de volúmenes', alumno: 'Agustín', edad: 15, tecnica: 'grafito' },
  { fn: 'acrilicoAbstracto', seed: 71, pal: PAL.pop, titulo: 'Ritmo y color', alumno: 'Catalina', edad: 28, tecnica: 'acrilico', exposicion: true },
  { fn: 'acuarelaFlores', seed: 81, pal: PAL.floresRosa, titulo: 'Flores del jardín', alumno: 'Antonia', edad: 52, tecnica: 'acuarela' },
  { fn: 'ceraOleoPeces', seed: 91, pal: PAL.mar, titulo: 'El fondo del mar', alumno: 'Florencia', edad: 7, tecnica: 'cera-oleo', exposicion: true },
  { fn: 'oleoBodegon', seed: 101, pal: PAL.bodegonCalido, titulo: 'Bodegón con frutas', alumno: 'Camila', edad: 61, tecnica: 'oleo' },
  { fn: 'pastelNoche', seed: 111, pal: PAL.noche, titulo: 'Noche en el pueblo', alumno: 'Joaquín', edad: 19, tecnica: 'cera-pastel', exposicion: true },
  { fn: 'lapicesFrutas', seed: 121, pal: PAL.frutasRojas, titulo: 'Manzanas', alumno: 'Emilia', edad: 11, tecnica: 'lapices-colores' },
  { fn: 'acrilicoCiudad', seed: 131, pal: PAL.ciudadAtardecer, titulo: 'Ciudad al atardecer', alumno: 'Javiera', edad: 23, tecnica: 'acrilico' },
  { fn: 'grafitoArbol', seed: 141, titulo: 'El árbol del patio', alumno: 'Clara', edad: 41, tecnica: 'grafito', exposicion: true },
  { fn: 'acuarelaPaisaje', seed: 151, pal: PAL.verde, titulo: 'Valle en primavera', alumno: 'Tomás', edad: 12, tecnica: 'acuarela' },
  { fn: 'oleoMarina', seed: 161, pal: PAL.marinaAzul, titulo: 'Mañana en la costa', alumno: 'Renata', edad: 38, tecnica: 'oleo' },
  { fn: 'ceraOleoCasa', seed: 171, pal: PAL.casaAtardecer, titulo: 'La casa de mi abuela', alumno: 'Benjamín', edad: 10, tecnica: 'cera-oleo' },
  { fn: 'acrilicoAbstracto', seed: 181, pal: PAL.pastelPop, titulo: 'Fiesta', alumno: 'Amanda', edad: 17, tecnica: 'acrilico' },
  { fn: 'lapicesMariposa', seed: 191, pal: PAL.mariposaNaranja, titulo: 'Monarca', alumno: 'Mateo', edad: 13, tecnica: 'lapices-colores' },
  { fn: 'acuarelaFlores', seed: 201, pal: PAL.floresAzul, titulo: 'Lavandas y lirios', alumno: 'Sofía', edad: 9, tecnica: 'acuarela' },
  { fn: 'oleoBodegon', seed: 211, pal: PAL.bodegonVerde, titulo: 'Naturaleza muerta en verde', alumno: 'Martina', edad: 34, tecnica: 'oleo' },
  { fn: 'pastelGirasoles', seed: 221, pal: PAL.girasolClaro, titulo: 'Girasoles al sol', alumno: 'Sofía', edad: 9, tecnica: 'cera-pastel' },
  { fn: 'lapicesFrutas', seed: 231, pal: PAL.frutasMoradas, titulo: 'Frutas de estación', alumno: 'Amanda', edad: 17, tecnica: 'lapices-colores' },
  { fn: 'grafitoVolumenes', seed: 241, titulo: 'Luz y sombra', alumno: 'Renata', edad: 38, tecnica: 'grafito' },
];

const nivelDe = (edad) => (edad <= 12 ? 'ninos' : edad <= 19 ? 'jovenes' : 'adultos');
const slug = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

// ---------- texturas decorativas ----------
function texturas() {
  const out = [];
  // manchas de acuarela con fondo transparente
  // Paleta oficial: 001219 005F73 0A9396 94D2BD E9D8A6 EE9B00 CA6702 BB3E03 AE2012 9B2226
  const washes = {
    petroleo: ['#005f73', '#0a9396', '#2b7f8c'],
    menta: ['#94d2bd', '#b8e2d3', '#6cbfa6'],
    ambar: ['#ee9b00', '#f5c35a', '#e9d8a6'],
    oxido: ['#bb3e03', '#ca6702', '#e07a3a'],
    vino: ['#9b2226', '#ae2012', '#c4555a'],
  };
  for (const [name, cols] of Object.entries(washes)) {
    const k = kit(name.length * 97 + 5); const { R, P } = k;
    const w = 900, h = 760;
    let b = '';
    for (let i = 0; i < 9; i++) b += `<ellipse cx="${f(R(w * 0.3, w * 0.7))}" cy="${f(R(h * 0.3, h * 0.7))}" rx="${f(R(120, 280))}" ry="${f(R(100, 230))}" fill="${P(cols)}" opacity="${f(R(0.18, 0.35))}" filter="url(#wc)"/>`;
    for (let i = 0; i < 5; i++) b += `<circle cx="${f(R(w * 0.15, w * 0.85))}" cy="${f(R(h * 0.15, h * 0.85))}" r="${f(R(10, 30))}" fill="${P(cols)}" opacity="0.4" filter="url(#wcEdge)"/>`;
    out.push({ file: `mancha-${name}.webp`, w, h, svg: svgWrap(w, h, 7, null, b, null), alpha: true });
  }
  // papel (mosaico)
  out.push({ file: 'papel.webp', w: 512, h: 512, svg: `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512"><defs><filter id="p" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="4" stitchTiles="stitch"/><feColorMatrix type="matrix" values="0 0 0 0 0.55  0 0 0 0 0.45  0 0 0 0 0.35  -1.1 0 0 0 0.62"/></filter><filter id="q" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="3" stitchTiles="stitch" seed="4"/><feColorMatrix type="matrix" values="0 0 0 0 0.85  0 0 0 0 0.7  0 0 0 0 0.5  -0.5 0 0 0 0.3"/></filter></defs><rect width="512" height="512" fill="#f5ecdc"/><rect width="512" height="512" filter="url(#q)"/><rect width="512" height="512" filter="url(#p)" opacity="0.35"/></svg>` });
  // lienzo (mosaico)
  out.push({ file: 'lienzo.webp', w: 400, h: 400, svg: `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><defs><filter id="w" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.9 0.05" numOctaves="1" stitchTiles="stitch" result="a"/><feTurbulence type="fractalNoise" baseFrequency="0.05 0.9" numOctaves="1" stitchTiles="stitch" seed="3" result="b"/><feBlend in="a" in2="b" mode="multiply"/><feColorMatrix type="matrix" values="0 0 0 0 0.3  0 0 0 0 0.25  0 0 0 0 0.2  -1.4 0 0 0 0.85"/></filter></defs><rect width="400" height="400" fill="#efe4cf"/><rect width="400" height="400" filter="url(#w)" opacity="0.6"/></svg>` });
  // texturas por técnica para las tarjetas (fondo opaco)
  const tk = (seed) => kit(seed);
  const W = 800, H = 560;
  { const k = tk(301); let b = ''; for (let i = 0; i < 8; i++) b += `<ellipse cx="${f(k.R(0, W))}" cy="${f(k.R(0, H))}" rx="${f(k.R(150, 320))}" ry="${f(k.R(100, 220))}" fill="${k.P(['#7fb3e6', '#f2a7c0', '#f7d58a', '#9fd6c0'])}" opacity="0.35" filter="url(#wc)"/>`; out.push({ file: 'tec-acuarela.webp', w: W, h: H, svg: svgWrap(W, H, 301, '#fbf6ec', b) }); }
  { const k = tk(302); out.push({ file: 'tec-oleo.webp', w: W, h: H, svg: svgWrap(W, H, 302, '#7a3b2e', `<g filter="url(#impasto)">${strokeField(k, W, H, (x, y) => ramp(['#f3b04a', '#e0603a', '#a83a4a', '#5a3a7a'], (x / W) * 0.5 + (y / H) * 0.5), { rot: 30 })}</g>`, 'weave', 0.5) }); }
  { const k = tk(303); let b = ''; for (let i = 0; i < 14; i++) b += `<rect x="${f(k.R(-100, W))}" y="${f(k.R(-100, H))}" width="${f(k.R(100, 350))}" height="${f(k.R(100, 350))}" fill="${k.P(['#e63946', '#2a9d8f', '#e9c46a', '#264653', '#f4a261', '#6d4fd1'])}" transform="rotate(${f(k.R(-25, 25))} 400 280)"/>`; out.push({ file: 'tec-acrilico.webp', w: W, h: H, svg: svgWrap(W, H, 303, '#f4ead5', `<g filter="url(#rough)">${b}</g>`, 'weave', 0.4) }); }
  { const k = tk(304); let b = ''; for (let i = 0; i < 600; i++) { const x = k.R(-40, W), y = k.R(-40, H), a = k.R(-0.6, 0.6); b += `<line x1="${f(x)}" y1="${f(y)}" x2="${f(x + Math.cos(a) * 70)}" y2="${f(y + Math.sin(a) * 70)}" stroke="${k.P(['#f28fb0', '#ffd166', '#8ecae6', '#b8e0a0', '#c9a7f0'])}" stroke-width="${f(k.R(12, 22))}" stroke-linecap="round"/>`; } out.push({ file: 'tec-cera-pastel.webp', w: W, h: H, svg: svgWrap(W, H, 304, '#fbf3e4', `<g filter="url(#crayon)">${b}</g>`) }); }
  { const k = tk(305); let b = hatch(k, { x: 0, y: 0, w: W, h: H }, 35, 7, ['#3a3a3a', '#555', '#6a6a6a'], 1.4, 0.45) + hatch(k, { x: W * 0.4, y: 0, w: W * 0.6, h: H }, -30, 8, ['#2b2b2b', '#444'], 1.3, 0.4); out.push({ file: 'tec-grafito.webp', w: W, h: H, svg: svgWrap(W, H, 305, '#f2eee5', `<g filter="url(#rough)">${b}</g>`) }); }
  { const k = tk(306); let b = ''; ['#e63946', '#f4a261', '#2a9d8f', '#6d4fd1', '#3a86ff'].forEach((c, i) => { b += hatch(k, { x: i * 150 - 80, y: -40, w: 280, h: H + 80 }, 30 + i * 12, 7, [c], 2.6, 0.6, 0.8); }); out.push({ file: 'tec-lapices-colores.webp', w: W, h: H, svg: svgWrap(W, H, 306, '#faf6ee', `<g filter="url(#rough)">${b}</g>`) }); }
  { const k = tk(308); let b = ''; for (let i = 0; i < 26; i++) { const x = k.R(-80, W), y = k.R(-60, H), a = k.R(-0.5, 0.5), l = k.R(160, 420); b += `<line x1="${f(x)}" y1="${f(y)}" x2="${f(x + Math.cos(a) * l)}" y2="${f(y + Math.sin(a) * l)}" stroke="${k.P(['#1c1c1c', '#2d2d2d', '#3a3a3a'])}" stroke-width="${f(k.R(18, 54))}" stroke-linecap="round" opacity="${f(k.R(0.35, 0.75))}"/>`; } let m = ''; for (let i = 0; i < 7; i++) m += `<ellipse cx="${f(k.R(0, W))}" cy="${f(k.R(0, H))}" rx="${f(k.R(90, 220))}" ry="${f(k.R(50, 120))}" fill="#4a4a4a" opacity="0.22"/>`; out.push({ file: 'tec-carboncillo.webp', w: W, h: H, svg: svgWrap(W, H, 308, '#efe9dd', `<g filter="url(#wc)">${m}</g><g filter="url(#crayon)">${b}</g>`) }); }
  { const k = tk(309); let b = ''; for (let i = 0; i < 34; i++) { const y = k.R(-40, H + 40), x = k.R(-200, W * 0.6); b += `<path d="M${f(x)},${f(y)} q${f(k.R(120, 260))},${f(k.R(-90, 90))} ${f(k.R(320, 620))},${f(k.R(-60, 60))}" stroke="${k.P(['#ff5fa2', '#ffd23f', '#3bceac', '#5b8cff', '#b46cff', '#ff8a3d'])}" stroke-width="${f(k.R(30, 46))}" stroke-linecap="round" fill="none" opacity="0.5" style="mix-blend-mode:multiply"/>`; } out.push({ file: 'tec-plumones-alcohol.webp', w: W, h: H, svg: svgWrap(W, H, 309, '#ffffff', b) }); }
  { const k = tk(310); let b = ''; const cs = ['#fefae0', '#ff4fa3', '#ffd60a', '#3ad6e8', '#7bf1a8', '#ff7b39']; for (let i = 0; i < 60; i++) b += `<circle cx="${f(k.R(0, W))}" cy="${f(k.R(0, H))}" r="${f(k.R(6, 18))}" fill="${k.P(cs)}"/>`; for (let i = 0; i < 12; i++) { let d = `M${f(k.R(-50, W))},${f(k.R(0, H))}`; for (let j = 0; j < 5; j++) d += ` q${f(k.R(-60, 60))},${f(k.R(-80, 80))} ${f(k.R(40, 110))},${f(k.R(-30, 30))}`; b += `<path d="${d}" stroke="${k.P(cs)}" stroke-width="${f(k.R(8, 14))}" stroke-linecap="round" fill="none"/>`; } out.push({ file: 'tec-plumones-acrilico.webp', w: W, h: H, svg: svgWrap(W, H, 310, '#1d2b36', `<g filter="url(#rough)">${b}</g>`) }); }
  { const k = tk(307); let b = ''; for (let y = -20; y < H + 20; y += 14) b += `<path d="M-20,${f(y)} Q${W / 2},${f(y + k.R(-40, 40))} ${W + 20},${f(y)}" stroke="${k.P(['#ff4f8b', '#ffcf1f', '#3fa0ff', '#58b947', '#ff9a1f', '#a45cff'])}" stroke-width="${f(k.R(14, 22))}" fill="none"/>`; out.push({ file: 'tec-cera-oleo.webp', w: W, h: H, svg: svgWrap(W, H, 307, '#fff', `<g filter="url(#crayon)">${b}</g>`) }); }
  return out;
}

// ---------- ejecución ----------
await fs.mkdir(OUT_OBRAS, { recursive: true });
await fs.mkdir(OUT_TEX, { recursive: true });
await fs.mkdir(path.dirname(DATA), { recursive: true });

// npm run arte -- --texturas  → solo regenera las texturas (rápido)
const soloTexturas = process.argv.includes('--texturas');
const obras = [];
let n = 0;
for (const item of soloTexturas ? [] : CATALOGO) {
  const { w, h, svg, color } = OBRAS[item.fn](item.seed, item.pal);
  const id = `${String(++n).padStart(2, '0')}-${slug(item.titulo)}`;
  const buf = Buffer.from(svg);
  const base = sharp(buf, { limitInputPixels: false });
  await base.clone().resize({ width: Math.round(w * 0.5) }).webp({ quality: 80 }).toFile(path.join(OUT_OBRAS, `${id}-800.webp`));
  await base.clone().webp({ quality: 84 }).toFile(path.join(OUT_OBRAS, `${id}-1600.webp`));
  obras.push({
    id,
    titulo: item.titulo,
    alumno: item.alumno,
    edad: item.edad,
    nivel: nivelDe(item.edad),
    tecnica: item.tecnica,
    anio: 2026,
    exposicion: Boolean(item.exposicion),
    ancho: w,
    alto: h,
    color,
    imagen: `/obras/${id}-1600.webp`,
    miniatura: `/obras/${id}-800.webp`,
  });
  console.log('obra', id);
}
if (!soloTexturas) await fs.writeFile(DATA, JSON.stringify(obras, null, 2) + '\n');

// npm run arte -- --texturas --solo=tec-carboncillo.webp,…  → solo esos archivos
const solo = process.argv.find((a) => a.startsWith('--solo='))?.slice(7).split(',');
for (const t of texturas().filter((t) => !solo || solo.includes(t.file))) {
  const img = sharp(Buffer.from(t.svg));
  await img.webp({ quality: t.alpha ? 78 : 80, alphaQuality: 80 }).toFile(path.join(OUT_TEX, t.file));
  console.log('textura', t.file);
}
console.log(`Listo: ${obras.length} obras y texturas generadas.`);
