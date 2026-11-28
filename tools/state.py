"""Verschlüsselter Depot-Stand im Repo (state.enc) + App-Daten (data.enc).
Schlüssel kommt aus der Umgebungsvariable DEPOT_KEY (nie ins Repo schreiben).

  python3 -I tools/state.py unpack <ordner>   # state.enc -> <ordner>/ (depot.json, praeferenzen.json, bestand.md, dashboard/...)
  python3 -I tools/state.py pack <ordner>     # <ordner>/ -> state.enc und data.enc (für die App)

Format: PBKDF2-SHA256 (310000) + AES-GCM, passend zu app.js."""
import base64, io, json, os, pathlib, sys, tarfile
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

REPO = pathlib.Path(__file__).resolve().parent.parent
SKIP = {'index.html', 'schluessel.txt'}
e, d = (lambda b: base64.b64encode(b).decode()), base64.b64decode

def key(salt, it):
    return PBKDF2HMAC(hashes.SHA256(), 32, salt, it).derive(os.environ['DEPOT_KEY'].strip().encode())

def seal(data: bytes) -> str:
    salt, iv, it = os.urandom(16), os.urandom(12), 310000
    return json.dumps({'v': 1, 'iter': it, 'salt': e(salt), 'iv': e(iv), 'ct': e(AESGCM(key(salt, it)).encrypt(iv, data, None))})

def open_(txt: str) -> bytes:
    env = json.loads(txt)
    return AESGCM(key(d(env['salt']), env['iter'])).decrypt(d(env['iv']), d(env['ct']), None)

def unpack(dst):
    dst = pathlib.Path(dst); dst.mkdir(parents=True, exist_ok=True)
    with tarfile.open(fileobj=io.BytesIO(open_((REPO / 'state.enc').read_text())), mode='r:gz') as t:
        t.extractall(dst, filter='data')
    print('entpackt nach', dst)

def pack(src):
    src = pathlib.Path(src); buf = io.BytesIO()
    with tarfile.open(fileobj=buf, mode='w:gz') as t:
        for p in sorted(src.rglob('*')):
            rel = p.relative_to(src)
            if p.is_file() and p.name not in SKIP and 'app' not in rel.parts[:1]:
                t.add(p, arcname=str(rel))
    (REPO / 'state.enc').write_text(seal(buf.getvalue()))
    app = json.loads((src / 'depot.json').read_text())
    app['praeferenzen'] = json.loads((src / 'praeferenzen.json').read_text())
    (REPO / 'data.enc').write_text(seal(json.dumps(app, ensure_ascii=False).encode()))
    print('state.enc + data.enc geschrieben')

if __name__ == '__main__':
    {'unpack': unpack, 'pack': pack}[sys.argv[1]](sys.argv[2])
