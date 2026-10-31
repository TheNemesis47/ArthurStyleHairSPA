import sys, os, math
sys.path.insert(0, os.path.dirname(__file__))
from text2path import shape, load
F = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'fonts'); OUT = sys.argv[1]; os.makedirs(OUT, exist_ok=True)
PINYON = f'{F}/PinyonScript-Regular.ttf'; JOST = f'{F}/Jost[wght].ttf'
TAUPE = '#726459'; CREAM = '#FBF8F1'; ESPRESSO = '#2B211C'
STROKE_EM = 2.2 / 150            # ingrossamento del tratto misurato sull'originale (2.2 px a corpo 150)

def fit_script(text, target, size=150):
    """Posiziona il testo script in modo che il bbox (con tratto) coincida con target=(x0,y0,x1,y1) in larghezza."""
    d, bb = shape(PINYON, text, size, 0, 0)
    sw = STROKE_EM * size
    w = (bb[2] - bb[0]) + sw
    s = (target[2] - target[0]) / w
    size2 = size * s
    d, bb = shape(PINYON, text, size2, 0, 0)
    sw = STROKE_EM * size2
    dx = target[0] - (bb[0] - sw / 2); dy = target[1] - (bb[1] - sw / 2)
    d, bb = shape(PINYON, text, size2, dx, dy)
    return d, sw, bb

def tagline(x0, x1, base, cap=17.5, wght=360, text='HAIR SPA'):
    tt, _ = load(JOST, wght); size = cap * tt['head'].unitsPerEm / tt['OS/2'].sCapHeight
    d0, b0 = shape(JOST, text, size, 0, 0, 0, wght)
    track = ((x1 - x0) - (b0[2] - b0[0])) / (len(text) - 1) / size
    d, bb = shape(JOST, text, size, 0, 0, track, wght)
    d, bb = shape(JOST, text, size, x0 - bb[0], base, track, wght)
    return d

# Geometria misurata sull'originale (910×589): script (91,188)-(808,366) · HAIR SPA (372..529, baseline 440) · linee 291-352 / 548-609 a y 427.5
script_d, script_sw, _ = fit_script('Arthur Style', (91, 188, 808, 366))
tag_d = tagline(372, 529, 440)
lines_d = 'M291 427.5H352M548 427.5H609'

def lockup(color, bg=None, pattern=False, vb=(71, 168, 757, 292), title='Arthur Style — Hair Spa'):
    x, y, w, h = vb
    parts = [f'<title>{title}</title>']
    if bg: parts.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{bg}"/>')
    if pattern: parts.append(f'<use href="#strands"/>')
    parts.append(f'<path d="{script_d}" fill="{color}" stroke="{color}" stroke-width="{script_sw:.2f}" stroke-linejoin="round"/>')
    parts.append(f'<path d="{lines_d}" stroke="{color}" stroke-width="1.6" fill="none"/>')
    parts.append(f'<path d="{tag_d}" fill="{color}"/>')
    defs = f'<defs>{strands_group(color)}</defs>' if pattern else ''
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{x} {y} {w} {h}" width="{w}" height="{h}" role="img" aria-label="{title}">'
            + defs + ''.join(parts) + '</svg>\n')

def strands_group(color, W=910, H=589, n=72):
    """Ciocche: fascio di linee sottili che scende verso destra e si stringe (ispirato allo sfondo del logo originale)."""
    paths = []
    for i in range(n):
        t = i / (n - 1)
        p0 = (-20, 25 + 400 * t); p1 = (280, 140 + 290 * t); p2 = (640, 300 + 170 * t); p3 = (W + 30, 300 + 330 * t)
        paths.append(f'M{p0[0]:.1f} {p0[1]:.1f}C{p1[0]:.1f} {p1[1]:.1f} {p2[0]:.1f} {p2[1]:.1f} {p3[0]:.1f} {p3[1]:.1f}')
    main = ''.join(f'<path d="{p}"/>' for p in paths)
    top = []
    for i in range(36):                                      # fascio leggero in alto a destra
        t = i / 35
        top.append(f'M{380+420*t:.1f} -10C{650+100*t:.1f} {40+30*t:.1f} {820:.1f} {60+120*t:.1f} {W+30} {30+200*t:.1f}')
    tops = ''.join(f'<path d="{p}"/>' for p in top)
    fade = ('<linearGradient id="fadeX" x1="0" x2="1" y1="0" y2="0">'
            '<stop offset="0" stop-color="#fff"/><stop offset="0.42" stop-color="#fff" stop-opacity="0.25"/>'
            '<stop offset="0.6" stop-color="#fff" stop-opacity="0.3"/><stop offset="1" stop-color="#fff"/></linearGradient>'
            f'<mask id="fade" maskUnits="userSpaceOnUse" x="0" y="0" width="{W}" height="{H}">'
            f'<rect width="{W}" height="{H}" fill="url(#fadeX)"/></mask>')
    return (fade + f'<g id="strands" fill="none" stroke="{color}" stroke-width="0.55" mask="url(#fade)">'
            f'<g stroke-opacity="0.38">{main}</g><g stroke-opacity="0.2">{tops}</g></g>')

def write(name, svg): open(os.path.join(OUT, name), 'w').write(svg); print('ok', name)

write('arthur-style-logo.svg', lockup(TAUPE))
write('arthur-style-logo-negativo.svg', lockup(CREAM, title='Arthur Style — Hair Spa (negativo)'))
write('arthur-style-logo-sfondo.svg', lockup(TAUPE, bg=CREAM, pattern=True, vb=(0, 0, 910, 589)))
# wordmark (solo script)
x0, y0 = 81, 178
write('arthur-style-wordmark.svg',
      f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{x0} {y0} 737 198" width="737" height="198" role="img" aria-label="Arthur Style"><title>Arthur Style</title>'
      f'<path d="{script_d}" fill="{TAUPE}" stroke="{TAUPE}" stroke-width="{script_sw:.2f}" stroke-linejoin="round"/></svg>\n')
# monogramma: A + S in Pinyon dentro un cerchio sottile
dA, bA = shape(PINYON, 'A', 300, 0, 0); dS, bS = shape(PINYON, 'S', 300, 0, 0)
def centered(d_fn, text, size, cx, cy):
    d, b = shape(PINYON, text, size, 0, 0)
    return shape(PINYON, text, size, cx - (b[0] + b[2]) / 2, cy - (b[1] + b[3]) / 2)[0]
mAS = centered(None, 'AS', 330, 256, 266)
sw_m = STROKE_EM * 330
write('arthur-style-monogramma.svg',
      f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512" role="img" aria-label="Arthur Style monogramma"><title>Arthur Style</title>'
      f'<circle cx="256" cy="256" r="236" fill="none" stroke="{TAUPE}" stroke-width="3"/>'
      f'<path d="{mAS}" fill="{TAUPE}" stroke="{TAUPE}" stroke-width="{sw_m:.2f}" stroke-linejoin="round"/></svg>\n')
# favicon / icona app: "A" su crema, tratto più pesante per leggibilità a piccole dimensioni
fA = centered(None, 'A', 400, 262, 270)
icon = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512" role="img" aria-label="Arthur Style"><title>Arthur Style</title>'
        f'<rect width="512" height="512" rx="112" fill="{CREAM}"/>'
        f'<path d="{fA}" fill="{TAUPE}" stroke="{TAUPE}" stroke-width="{STROKE_EM*400*1.8:.2f}" stroke-linejoin="round"/></svg>\n')
write('favicon.svg', icon)
aA = centered(None, 'A', 290, 262, 268)
write('app-icon.svg', f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512" role="img" aria-label="Arthur Style"><title>Arthur Style</title>'
      f'<rect width="512" height="512" fill="{CREAM}"/>'
      f'<path d="{aA}" fill="{TAUPE}" stroke="{TAUPE}" stroke-width="{STROKE_EM*290*1.6:.2f}" stroke-linejoin="round"/></svg>\n')   # niente angoli: la maschera la applicano gli store

def social(W, H, logo_w):
    s_ = logo_w / 757; lx = (W - 757 * s_) / 2 - 71 * s_; ly = (H - 292 * s_) / 2 - 168 * s_
    sx, sy = W / 910, H / 589
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" role="img" aria-label="Arthur Style — Hair Spa">'
            f'<title>Arthur Style — Hair Spa</title><defs>{strands_group(TAUPE)}</defs>'
            f'<rect width="{W}" height="{H}" fill="{CREAM}"/><g transform="scale({sx:.4f} {sy:.4f})"><use href="#strands"/></g>'
            f'<g transform="translate({lx:.2f} {ly:.2f}) scale({s_:.4f})">'
            f'<path d="{script_d}" fill="{TAUPE}" stroke="{TAUPE}" stroke-width="{script_sw:.2f}" stroke-linejoin="round"/>'
            f'<path d="{lines_d}" stroke="{TAUPE}" stroke-width="1.6" fill="none"/><path d="{tag_d}" fill="{TAUPE}"/></g></svg>\n')
write('social-1200x630.svg', social(1200, 630, 820))
write('social-1080x1080.svg', social(1080, 1080, 820))
