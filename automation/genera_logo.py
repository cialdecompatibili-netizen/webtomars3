# GUIDA-SVILUPPO: genera il LOGO (quadrato in pelle con cucitura a punti e iniziale) coi colori di _data/tema.json (accent, accent_dark).
# Uso, dalla radice del sito:  python automation/genera_logo.py            (oppure: python automation/genera_logo.py "#8a6a3a" "#503629" "P")
# Scrive: assets/images/favicon.svg, favicon-32/192/512.png, apple-touch-icon.png, favicon.ico (in assets/images e nella radice).
# L'iniziale e' la prima lettera del titolo del sito se non la passi. Richiede Pillow (font Georgia di Windows, ripiego: font di default).
import json, math, os, sys
from PIL import Image, ImageDraw, ImageFont
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IMG = os.path.join(ROOT, 'assets', 'images')
def hx(s): s = s.lstrip('#'); return tuple(int(s[i:i+2], 16) for i in (0, 2, 4))
def mix(a, b, t): return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))
def h(c): return '#%02x%02x%02x' % c
tema = json.load(open(os.path.join(ROOT, '_data', 'tema.json'), encoding='utf-8'))
acc = sys.argv[1] if len(sys.argv) > 1 else tema.get('accent', '#8a6a3a')
dark = sys.argv[2] if len(sys.argv) > 2 else tema.get('accent_dark', '#503629')
ini = (sys.argv[3] if len(sys.argv) > 3 else 'P')[:1].upper()
TOP = mix(hx(acc), (255, 255, 255), .12); BOT = mix(hx(dark), hx(acc), .25); THREAD = (241, 231, 214); INK = (247, 243, 236)
svg = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="%s"/><stop offset="1" stop-color="%s"/></linearGradient></defs>'
  '<rect width="64" height="64" rx="14" fill="url(#s)"/><rect x="5.5" y="5.5" width="53" height="53" rx="9.5" fill="none" stroke="%s" stroke-width="1.6" stroke-dasharray="3.4 2.6" stroke-linecap="round" opacity=".85"/>'
  '<text x="32" y="45.5" text-anchor="middle" font-family="Georgia,\'Times New Roman\',serif" font-weight="700" font-size="36" fill="%s">%s</text></svg>\n'
  % (h(TOP), h(BOT), h(THREAD), h(INK), ini))
open(os.path.join(IMG, 'favicon.svg'), 'w', encoding='utf-8', newline='\n').write(svg)
def font(px):
    for f in ('georgiab.ttf', 'georgia.ttf', 'timesbd.ttf', 'DejaVuSerif-Bold.ttf'):
        try: return ImageFont.truetype(f, px)
        except Exception: pass
    return ImageFont.load_default()
def perimetro(x0, y0, x1, y1, r, step=1.0):
    pts = []
    def arc(cx, cy, a0, a1):
        n = max(8, int(abs(a1 - a0) * r / step))
        for i in range(n + 1):
            a = a0 + (a1 - a0) * i / n; pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    def line(ax, ay, bx, by):
        n = max(1, int(math.hypot(bx - ax, by - ay) / step))
        for i in range(n + 1): pts.append((ax + (bx - ax) * i / n, ay + (by - ay) * i / n))
    line(x0 + r, y0, x1 - r, y0); arc(x1 - r, y0 + r, -math.pi / 2, 0)
    line(x1, y0 + r, x1, y1 - r); arc(x1 - r, y1 - r, 0, math.pi / 2)
    line(x1 - r, y1, x0 + r, y1); arc(x0 + r, y1 - r, math.pi / 2, math.pi)
    line(x0, y1 - r, x0, y0 + r); arc(x0 + r, y0 + r, math.pi, 1.5 * math.pi)
    return pts
def render(N, tondo=True):
    S = 4; M = N * S
    im = Image.new('RGBA', (M, M), (0, 0, 0, 0)); px = im.load()
    g = Image.new('RGB', (1, M))
    for y in range(M): g.putpixel((0, y), mix(TOP, BOT, y / (M - 1)))
    bg = g.resize((M, M)).convert('RGBA')
    mask = Image.new('L', (M, M), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, M - 1, M - 1), radius=int(M * (14 / 64)) if tondo else 0, fill=255)
    im.paste(bg, (0, 0), mask)
    d = ImageDraw.Draw(im)
    m = M * (5.5 / 64); pts = perimetro(m, m, M - m, M - m, M * (9.5 / 64), step=1.0)
    dash, gap = M * (3.4 / 64), M * (2.6 / 64); acc_len = 0.0; on = True; seg = []
    for i in range(1, len(pts)):
        acc_len += math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])
        if on: seg.append(pts[i - 1])
        if acc_len >= (dash if on else gap):
            if on and len(seg) > 1: d.line(seg + [pts[i]], fill=THREAD + (215,), width=max(2, int(M * 1.6 / 64)), joint='curve')
            seg = []; on = not on; acc_len = 0.0
    f = font(int(M * 0.62)); d.text((M / 2, M * 0.52), ini, font=f, fill=INK + (255,), anchor='mm')
    return im.resize((N, N), Image.LANCZOS)
for n, name in ((32, 'favicon-32.png'), (72, 'logo-72.png'), (192, 'favicon-192.png'), (512, 'favicon-512.png')):
    render(n).save(os.path.join(IMG, name))
render(180, tondo=False).convert('RGB').save(os.path.join(IMG, 'apple-touch-icon.png'))
ico = render(256); ico.save(os.path.join(IMG, 'favicon.ico'), sizes=[(16, 16), (32, 32), (48, 48)])
ico.save(os.path.join(ROOT, 'favicon.ico'), sizes=[(16, 16), (32, 32), (48, 48)])
print('logo scritto: iniziale', ini, h(TOP), h(BOT))
