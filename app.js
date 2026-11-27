// Lädt data.enc, entschlüsselt lokal (PBKDF2-SHA256 + AES-GCM) und rendert das Dashboard.
(() => {
const KEY = 'depot-pw';
const $ = id => document.getElementById(id);
const b64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
const PKG = {consors: 'de.consorsbank', ing: 'de.ingdiba.bankingapp'};
const NAME = {consors: 'Consorsbank', ing: 'ING'};

// Passwort einmalig per Link (#k=...) übernehmen; der Teil nach # geht nie an den Server.
const m = location.hash.match(/k=([^&]+)/);
if (m) { localStorage.setItem(KEY, decodeURIComponent(m[1])); history.replaceState(null, '', location.pathname); }

async function decrypt(env, pw) {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveKey']);
  const key = await crypto.subtle.deriveKey({name: 'PBKDF2', salt: b64(env.salt), iterations: env.iter, hash: 'SHA-256'},
    base, {name: 'AES-GCM', length: 256}, false, ['decrypt']);
  const pt = await crypto.subtle.decrypt({name: 'AES-GCM', iv: b64(env.iv)}, key, b64(env.ct));
  return JSON.parse(new TextDecoder().decode(pt));
}

async function load() {
  const r = await fetch('data.enc?t=' + Date.now(), {cache: 'no-store'}).catch(() => fetch('data.enc'));
  return r.json();
}

function lock(msg) {
  $('lock').hidden = false;
  $('lockmsg').textContent = msg || '';
  $('pw').focus();
}

async function start() {
  let env;
  try { env = await load(); } catch (e) { lock('Daten konnten nicht geladen werden. Bitte später erneut öffnen.'); return; }
  const pw = localStorage.getItem(KEY);
  if (!pw) { lock(); return; }
  let D;
  try { D = await decrypt(env, pw); } catch (e) { localStorage.removeItem(KEY); lock('Passwort passt nicht.'); return; }
  $('lock').hidden = true;
  render(D);
}

$('lockf').addEventListener('submit', e => {
  e.preventDefault();
  localStorage.setItem(KEY, $('pw').value);
  $('pw').value = '';
  start();
});

let tt;
function toast(t) {
  const el = $('toast'); el.textContent = t; el.style.display = 'block';
  clearTimeout(tt); tt = setTimeout(() => el.style.display = 'none', 4500);
}

// Kaufen: ISIN kopieren, dann Bank-App per Android-Intent öffnen (Fallback: Play Store).
document.addEventListener('click', async e => {
  const b = e.target.closest('.buy button');
  if (!b) return;
  const isin = b.dataset.isin, bank = b.dataset.bank, pkg = PKG[bank];
  let copied = false;
  try { await navigator.clipboard.writeText(isin); copied = true; } catch (_) {}
  toast(copied ? `ISIN ${isin} kopiert. In der ${NAME[bank]}-App in die Suche einfügen.` : `ISIN ${isin}: in der ${NAME[bank]}-App suchen.`);
  if (/Android/i.test(navigator.userAgent)) {
    const fb = encodeURIComponent('https://play.google.com/store/apps/details?id=' + pkg);
    setTimeout(() => { location.href = `intent://#Intent;package=${pkg};S.browser_fallback_url=${fb};end`; }, 600);
  }
});

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
start();
})();
