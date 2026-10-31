"""Testo → tracciato SVG (shaping HarfBuzz: legature, kerning, alternative contestuali degli script)."""
import uharfbuzz as hb
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen
from fontTools.varLib import instancer
import io, functools

@functools.lru_cache(None)
def load(path, wght=None):
    tt = TTFont(path)
    if wght is not None and 'fvar' in tt:
        tt = instancer.instantiateVariableFont(tt, {"wght": wght})
    buf = io.BytesIO(); tt.save(buf); data = buf.getvalue()
    return TTFont(io.BytesIO(data)), data

def shape(path, text, size, x=0, y=0, tracking=0.0, wght=None, features=None):
    """Restituisce (d, bbox) per il testo con baseline in (x, y). tracking in em."""
    tt, data = load(path, wght)
    upem = tt['head'].unitsPerEm
    face = hb.Face(data); font = hb.Font(face)
    buf = hb.Buffer(); buf.add_str(text); buf.guess_segment_properties()
    hb.shape(font, buf, features or {"kern": True, "liga": True, "calt": True})
    gs = tt.getGlyphSet(); order = tt.getGlyphOrder()
    s = size / upem
    pen = SVGPathPen(gs); bpen = BoundsPen(gs)
    cx = 0
    for info, pos in zip(buf.glyph_infos, buf.glyph_positions):
        name = order[info.codepoint]
        gx = x + (cx + pos.x_offset) * s
        gy = y - pos.y_offset * s
        t = (s, 0, 0, -s, gx, gy)               # y verso il basso in SVG
        gs[name].draw(TransformPen(pen, t)); gs[name].draw(TransformPen(bpen, t))
        cx += pos.x_advance + tracking * upem
    return pen.getCommands(), bpen.bounds      # bounds: (xMin, yMin, xMax, yMax) in coordinate SVG
