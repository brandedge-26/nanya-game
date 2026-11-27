"""Build: python3 build.py  ->  ../dist/index.html (CDN Three.js) and ../dist-selfhosted/index.html (./vendor)"""
import base64, os, sys
HERE = os.path.dirname(os.path.abspath(__file__)); A = os.path.join(HERE, 'assets')
def b64(n, mime): return f"data:{mime};base64," + base64.b64encode(open(os.path.join(A, n), 'rb').read()).decode()
SRC = ['p1_engine.js', 'p2_audio.js', 'p3_game.js', 'p4_ui.js', 'p5_intro.js', 'p6_features.js']
js = '\n'.join(open(os.path.join(HERE, f), encoding='utf8').read() for f in SRC if os.path.exists(os.path.join(HERE, f)))
rep = {'__LOGO_FULL__': b64('nanya-logo-hd.webp', 'image/webp'), '__LOGO__': b64('logo-white.png', 'image/png'), '__IMG_NV__': b64('nv855.jpg', 'image/jpeg'),
       '__IMG_X8__': b64('nanox8.jpg', 'image/jpeg'), '__IMG_36__': b64('3605m.jpg', 'image/jpeg')}
html = open(os.path.join(HERE, 'shell.html'), encoding='utf8').read().replace('__SCRIPT__', js)
ver = [l for l in js.splitlines() if l.startswith('const VERSION')][0].split("'")[1]
html = html.replace('__VER__', ver)
for k, v in rep.items(): html = html.replace(k, v)
CDN = 'https://cdn.jsdelivr.net/npm/three@0.160.0/'
outs = sys.argv[1:] or ['local']
if 'local' in outs: open(os.path.join(HERE, 'index.html'), 'w', encoding='utf8').write(html)
for out, base in [('dist', CDN), ('dist-selfhosted', './vendor/three/')]:
    if out in outs:
        os.makedirs(os.path.join(HERE, '..', out), exist_ok=True)
        open(os.path.join(HERE, '..', out, 'index.html'), 'w', encoding='utf8').write(html.replace(CDN, base))
print('built', len(html) // 1024, 'KB')
