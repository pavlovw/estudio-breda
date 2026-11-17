"""
Descarga las FOTOS (sin videos) de un perfil público de Instagram:
publicaciones y, si inicias sesión, historias destacadas.
Deja todo ordenado en una carpeta y opcionalmente en un .zip.

Usa instaloader (https://instaloader.github.io), instalado en .venv.

Ejemplos:
  descargar.bat                                   -> solo publicaciones de estudiobreda_arte
  descargar.bat estudiobreda_arte --navegador chrome   -> + destacadas, usando tu sesión de Chrome
  descargar.bat estudiobreda_arte --usuario TU_USUARIO -> + destacadas, pide tu contraseña en la terminal
  descargar.bat estudiobreda_arte --zip

Notas:
- Las historias destacadas SOLO se pueden bajar con sesión iniciada (lo exige Instagram).
- Usa este programa solo con perfiles cuyas fotos tengas derecho a usar (por ejemplo, el de tu hermana).
- Si Instagram responde "Please wait a few minutes", espera un rato y vuelve a correrlo:
  continúa donde quedó y no repite lo ya descargado.
"""

from __future__ import annotations

import argparse
import shutil
import subprocess
import sys
from pathlib import Path

AQUI = Path(__file__).resolve().parent
EXT_FOTO = {".jpg", ".jpeg", ".png", ".webp", ".heic"}


def main() -> int:
    p = argparse.ArgumentParser(description="Descarga solo fotos de un perfil de Instagram.")
    p.add_argument("perfil", nargs="?", default="estudiobreda_arte", help="usuario de Instagram (sin @)")
    sesion = p.add_mutually_exclusive_group()
    sesion.add_argument("--usuario", help="tu usuario de Instagram para iniciar sesión (te pedirá la contraseña)")
    sesion.add_argument(
        "--navegador",
        choices=["chrome", "firefox", "edge", "brave", "opera", "chromium", "safari"],
        help="usa la sesión de Instagram ya abierta en ese navegador",
    )
    p.add_argument("--sin-destacadas", action="store_true", help="no descargar historias destacadas")
    p.add_argument("--salida", type=Path, default=AQUI / "descargas", help="carpeta donde guardar")
    p.add_argument("--zip", action="store_true", help="crear además un .zip con todo")
    a = p.parse_args()

    perfil = a.perfil.strip().lstrip("@").rstrip("/").split("/")[-1]
    con_sesion = bool(a.usuario or a.navegador)
    destacadas = con_sesion and not a.sin_destacadas
    base = a.salida.resolve()
    destino = base / perfil
    base.mkdir(parents=True, exist_ok=True)

    cmd = [
        sys.executable, "-m", "instaloader",
        "--no-videos", "--no-video-thumbnails",
        "--no-captions", "--no-metadata-json", "--no-compress-json",
        "--no-profile-pic",
        "--dirname-pattern", str(base / "{target}"),
        "--filename-pattern", "{date_utc:%Y-%m-%d_%H-%M-%S}_{shortcode}",
    ]
    if a.usuario:
        cmd += ["--login", a.usuario]
    if a.navegador:
        cmd += ["--load-cookies", a.navegador]
    if destacadas:
        cmd.append("--highlights")
    cmd.append(perfil)

    print(f"\n>> Descargando fotos de @{perfil}")
    print(f"   Publicaciones: sí | Destacadas: {'sí' if destacadas else 'no (requiere --navegador o --usuario)'}")
    print(f"   Carpeta: {destino}\n")

    resultado = subprocess.run(cmd, cwd=base)

    if not destino.exists():
        print("\n!! No se descargó nada. Revisa el mensaje de arriba (perfil privado, límite de Instagram o sesión).")
        return resultado.returncode or 1

    ordenar(destino)
    fotos_pub = contar(destino / "publicaciones")
    fotos_dest = sum(contar(d) for d in (destino / "destacadas").glob("*")) if (destino / "destacadas").exists() else 0
    print(f"\n>> Listo: {fotos_pub} fotos de publicaciones y {fotos_dest} de destacadas en:\n   {destino}")

    if a.zip:
        archivo = shutil.make_archive(str(base / perfil), "zip", root_dir=base, base_dir=perfil)
        print(f">> Zip creado: {archivo}")

    if resultado.returncode != 0:
        print("\n(Aviso: instaloader terminó con errores; puede que falten algunas fotos. Vuelve a correrlo más tarde.)")
    return 0


def ordenar(destino: Path) -> None:
    """Borra lo que no sea foto y separa publicaciones / destacadas."""
    pub = destino / "publicaciones"
    dest = destino / "destacadas"
    pub.mkdir(exist_ok=True)

    for f in list(destino.rglob("*")):
        if f.is_file() and f.suffix.lower() not in EXT_FOTO:
            f.unlink()

    # fotos sueltas en la raíz = publicaciones
    for f in destino.iterdir():
        if f.is_file():
            f.replace(pub / f.name)

    # subcarpetas (una por destacada) -> destacadas/<título>
    for d in list(destino.iterdir()):
        if d.is_dir() and d.name not in ("publicaciones", "destacadas"):
            dest.mkdir(exist_ok=True)
            final = dest / d.name
            if final.exists():
                for f in d.iterdir():
                    f.replace(final / f.name)
                d.rmdir()
            else:
                d.replace(final)

    for d in sorted(destino.rglob("*"), reverse=True):
        if d.is_dir() and not any(d.iterdir()):
            d.rmdir()


def contar(carpeta: Path) -> int:
    return sum(1 for f in carpeta.rglob("*") if f.is_file()) if carpeta.exists() else 0


if __name__ == "__main__":
    sys.exit(main())
