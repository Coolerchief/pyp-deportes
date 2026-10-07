"""Genera los SVG del logotipo P&P Deportes Coapa a partir de la construcción
del manual (pág. 9) y medidas tomadas del PDF. Texto convertido a curvas con
Barlow Condensed (OFL). Unidad = x (1/10 de la altura de la placa)."""
import math, os
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.recordingPen import RecordingPen

FONTS = '/home/claude/assets/fonts/fontsource-barlow-condensed-5.3.0/files/'
OUT = '/home/claude/assets/logos'
os.makedirs(OUT, exist_ok=True)
T = math.tan(math.radians(13))

C = dict(rojo='#E63323', noche='#0F1C2E', lima='#D4F53C', blanco='#FFFFFF')
VERSIONS = {
    'positivo':    dict(diag=C['noche'], plate=C['rojo'],  name=C['noche'],  loc=C['rojo']),
    'negativo':    dict(diag=C['lima'],  plate=C['rojo'],  name=C['blanco'], loc=C['lima']),
    'mono-noche':  dict(diag=C['noche'], plate=C['noche'], name=C['noche'],  loc=C['noche']),
    'mono-blanco': dict(diag=C['blanco'],plate=C['blanco'],name=C['blanco'], loc=C['blanco']),
}

def text_outline(text, weight, track_em=0.0):
    """Devuelve (RecordingPen en unidades de fuente con y hacia abajo, bbox)."""
    f = TTFont(f'{FONTS}barlow-condensed-latin-{weight}-italic.woff')
    gs = f.getGlyphSet(); cmap = f.getBestCmap(); hm = f['hmtx']; upm = f['head'].unitsPerEm
    rec = RecordingPen(); x = 0
    for ch in text:
        g = cmap[ord(ch)]
        gs[g].draw(TransformPen(rec, (1, 0, 0, -1, x, 0)))  # y hacia abajo
        x += hm[g][0] + track_em * upm
    bp = BoundsPen(None); rec.replay(bp)
    return rec, bp.bounds

def fit(rec, bounds, x0, y0, width=None, height=None):
    """Escala uniforme para que el bbox de tinta mida width (o height) y empiece en (x0,y0)."""
    bx0, by0, bx1, by1 = bounds
    s = width / (bx1 - bx0) if width else height / (by1 - by0)
    pen = SVGPathPen(None, ntos=lambda v: f'{v:.3f}'.rstrip('0').rstrip('.'))
    rec.replay(TransformPen(pen, (s, 0, 0, s, x0 - bx0 * s, y0 - by0 * s)))
    return pen.getCommands()

def para(x_bottom, y_top, y_bottom, w):
    """Paralelogramo inclinado 13° (esquina inferior izquierda en x_bottom)."""
    h = y_bottom - y_top; s = h * T
    pts = [(x_bottom + s, y_top), (x_bottom + s + w, y_top), (x_bottom + w, y_bottom), (x_bottom, y_bottom)]
    return 'M' + ' L'.join(f'{a:.3f} {b:.3f}' for a, b in pts) + ' Z'

def mark_paths():
    """Doble diagonal + placa con P&P calado (evenodd). Ocupa x 0..23.41, y 0..10."""
    thin = para(0.0, 0, 10, 0.6)
    thick = para(1.15, 0, 10, 1.1)
    plate = para(2.8, 0, 10, 18.3)
    rec, b = text_outline('P&P', 900, -0.01)
    # P&P: alto de mayúscula 7.6x, centrado vertical (1.2..8.8) y horizontal en la placa a media altura
    s = 7.6 / (b[3] - b[1])
    wpx = (b[2] - b[0]) * s
    cx = 2.8 + 18.3 / 2 + 5 * T
    letters = fit(rec, b, cx - wpx / 2, 1.2, height=7.6)
    return thin, thick, plate + ' ' + letters

def svg(w, h, body, title):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w:.3f} {h:.3f}" '
            f'role="img" aria-label="{title}"><title>{title}</title>{body}</svg>\n')

def build():
    thin, thick, plate = mark_paths()
    # Horizontal
    rec_d, bd = text_outline('DEPORTES', 800, 0.034)
    dep_h = fit(rec_d, bd, 24.86, 0.0, width=54.94 - 24.86)
    rec_c, bc = text_outline('COAPA', 600, 0.326)
    coa_h = fit(rec_c, bc, 27.31, 7.78, width=38.27 - 27.31)
    dash_h = para(23.66, 8.55, 9.31, 2.58)
    # Vertical
    dep_v = fit(rec_d, bd, 0.45, 11.49, width=22.86 - 0.45)
    coa_v = fit(rec_c, bc, 8.25, 16.63, width=15.04 - 8.25)
    lines_v = 'M0.58 17.18 H6.07 V17.44 H0.58 Z M16.4 17.18 H22.9 V17.44 H16.4 Z'

    for v, c in VERSIONS.items():
        mark = (f'<path fill="{c["diag"]}" d="{thin} {thick}"/>'
                f'<path fill="{c["plate"]}" fill-rule="evenodd" d="{plate}"/>')
        h = (mark + f'<path fill="{c["name"]}" d="{dep_h}"/>'
             f'<path fill="{c["loc"]}" d="{coa_h} {dash_h}"/>')
        open(f'{OUT}/logo-horizontal-{v}.svg', 'w').write(svg(55.0, 10.0, h, 'P&amp;P Deportes Coapa'))
        vt = (mark + f'<path fill="{c["name"]}" d="{dep_v}"/>'
              f'<path fill="{c["loc"]}" d="{coa_v} {lines_v}"/>')
        open(f'{OUT}/logo-vertical-{v}.svg', 'w').write(svg(23.45, 18.0, vt, 'P&amp;P Deportes Coapa'))
        open(f'{OUT}/monograma-{v}.svg', 'w').write(svg(23.45, 10.0, mark, 'P&amp;P'))

if __name__ == '__main__':
    build()
    print(sorted(os.listdir(OUT)))
