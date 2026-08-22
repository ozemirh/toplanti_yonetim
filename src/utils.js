/* ============================================================
   ORTAK YARDIMCI FONKSİYONLAR
   Durum (state) bağımlılığı olmayan, saf yardımcı fonksiyonlar.
   ============================================================ */

export function makeId(p) { return `${p}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`; }

export function normalizeName(v) { return String(v || '').trim().replace(/\s+/g, ' '); }
export function upper(v) { return normalizeName(v).toLocaleUpperCase('tr'); }

/* ---------- FİRMA ADI EŞLEŞTİRME ----------
   Serbest metinle girilen firma adları yazım farkları içerir
   ("TUSAŞ", "Tusas", "TUSAŞ A.Ş."). Bu yüzden karşılaştırma için
   agresif bir sadeleştirme yapılır: Türkçe harfler ASCII'ye çevrilir,
   noktalama ve ticari unvan ekleri atılır. */
export const UNVAN_EKLERI = /\b(a\.?\s?s\.?|ltd|sti|s\.?t\.?i\.?|san|sanayi|tic|ticaret|ve|anonim|limited|sirketi|sirket|holding|grup|group|inc|llc|co)\b/g;

export function asciiFold(v) {
  return String(v || '')
    .replace(/[çÇ]/g, 'c').replace(/[ğĞ]/g, 'g').replace(/[ıİiI]/g, 'i')
    .replace(/[öÖ]/g, 'o').replace(/[şŞ]/g, 's').replace(/[üÜ]/g, 'u');
}

/* Karşılaştırma anahtarı — görüntülemede kullanılmaz. */
export function firmaAnahtar(ad) {
  return asciiFold(String(ad || '').toLocaleLowerCase('tr'))
    .replace(/[.,\-_/&'"()]/g, ' ')
    .replace(UNVAN_EKLERI, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/* Levenshtein tabanlı benzerlik oranı (0–1). */
export function benzerlik(a, b) {
  if (a === b) return 1;
  if (!a.length || !b.length) return 0;
  const m = a.length, n = b.length;
  let onceki = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    const simdi = [i];
    for (let j = 1; j <= n; j++) {
      simdi[j] = Math.min(onceki[j] + 1, simdi[j - 1] + 1, onceki[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    onceki = simdi;
  }
  return 1 - onceki[n] / Math.max(m, n);
}

export function parseClock(v) {
  const m = String(v || '').trim().match(/^(\d{1,2})[:.](\d{2})/);
  if (!m) return null;
  const h = Number(m[1]), mi = Number(m[2]);
  if (h > 23 || mi > 59) return null;
  return h * 60 + mi;
}
export function fmtClock(mins) {
  const w = ((Math.round(mins) % 1440) + 1440) % 1440;
  return `${String(Math.floor(w / 60)).padStart(2, '0')}:${String(w % 60).padStart(2, '0')}`;
}
export function fmtCounter(sec) {
  const neg = sec < 0;
  const a = Math.abs(Math.floor(sec));
  return `${neg ? '-' : ''}${String(Math.floor(a / 60)).padStart(2, '0')}:${String(a % 60).padStart(2, '0')}`;
}
export function esc(v) {
  return String(v ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}

export function kopyalaSessiz(metin, sonuc) {
  if (navigator.clipboard?.writeText && window.isSecureContext) {
    navigator.clipboard.writeText(metin).then(() => sonuc(true)).catch(() => sonuc(false));
    return;
  }
  try {
    const a = document.createElement('textarea');
    a.value = metin; a.style.position = 'fixed'; a.style.top = '-1000px';
    document.body.appendChild(a); a.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(a); sonuc(ok);
  } catch (e) { sonuc(false); }
}

export function indirDosya(icerik, ad, tur) {
  const url = URL.createObjectURL(new Blob([icerik], { type: tur }));
  const a = document.createElement('a');
  a.href = url; a.download = ad;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
