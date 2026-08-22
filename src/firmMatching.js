/* ============================================================
   FİRMA ADI EŞLEŞTİRME / RESMİ FİRMA LİSTESİ YÖNETİMİ
   ============================================================ */
import { state, saveState } from './store.js';
import { normalizeName, upper, firmaAnahtar, benzerlik } from './utils.js';
import { openModal } from './render/modal.js';
import { render } from './render/router.js';

/* Girilen adı resmi firma listesindeki karşılığına çevirir.
   Sıra: tam eşleşme → kullanıcı onaylı eşleme → ham ad. */
export function esasAd(ad) {
  const k = firmaAnahtar(ad);
  if (!k) return normalizeName(ad);
  const resmi = (state.firms || []).find(f => firmaAnahtar(f) === k);
  if (resmi) return resmi;
  const eslesme = state.firmAliases && state.firmAliases[k];
  if (eslesme) return eslesme;
  return normalizeName(ad);
}

/* Ad resmi listede var mı? */
export function listedeVar(ad) {
  const e = esasAd(ad);
  return (state.firms || []).some(f => firmaAnahtar(f) === firmaAnahtar(e));
}

/* Listede olmayan adlar için en yakın firmayı önerir. */
export function enYakinFirma(ad) {
  const k = firmaAnahtar(ad);
  let iyi = null, skor = 0;
  (state.firms || []).forEach(f => {
    const s = benzerlik(k, firmaAnahtar(f));
    if (s > skor) { skor = s; iyi = f; }
  });
  return skor >= 0.6 ? { firma: iyi, skor } : null;
}

/* Taleplerde geçip resmi listede olmayan adlar. */
export function taninmayanAdlar() {
  const m = new Map();
  state.requests.forEach(r => [r.from, r.to].forEach(ad => {
    if (listedeVar(ad)) return;
    const k = firmaAnahtar(ad);
    if (!k) return;
    if (!m.has(k)) m.set(k, { ad: normalizeName(ad), sayi: 0, oneri: enYakinFirma(ad) });
    m.get(k).sayi++;
  }));
  return [...m.values()];
}

/* Firma listesi yönetimi */
export function firmaEkleToplu() {
  const kutu = document.getElementById('firmBox');
  const gelen = String(kutu?.value || '').split(/[\r\n;]+/).map(normalizeName).filter(Boolean);
  if (!gelen.length) return;
  const mevcut = new Set((state.firms || []).map(firmaAnahtar));
  let eklendi = 0;
  gelen.forEach(f => { const k = firmaAnahtar(f); if (k && !mevcut.has(k)) { state.firms.push(f); mevcut.add(k); eklendi++; } });
  state.firms.sort((a, b) => a.localeCompare(b, 'tr'));
  if (kutu) kutu.value = '';
  saveState(); render();
  openModal({ title: 'Firmalar Eklendi', message: `${eklendi} firma eklendi. Toplam ${state.firms.length} firma.` + (gelen.length - eklendi ? ` ${gelen.length - eklendi} tanesi zaten listedeydi.` : ''), alertOnly: true });
}

export function firmaSil(ad) {
  state.firms = state.firms.filter(f => f !== ad);
  saveState(); render();
}

export function firmaListesiniTemizle() {
  openModal({ title: 'Firma Listesini Temizle', message: 'Tüm katılımcı firmalar silinsin mi? Talepler etkilenmez.', confirmText: 'TEMİZLE', danger: true,
    onConfirm: () => { state.firms = []; saveState(); render(); } });
}

/* Google Forms açılır listesine yapıştırmak üzere listeyi kopyalar. */
export function firmaListesiniKopyala() {
  if (!state.firms.length) { openModal({ title: 'Liste Boş', message: 'Önce firmaları ekleyin.', alertOnly: true }); return; }
  kopyala(state.firms.join('\n'));
}

export function kopyala(metin) {
  const bildir = ok => openModal({ title: ok ? 'Kopyalandı' : 'Kopyalanamadı', message: ok ? 'Adres panoya kopyalandı.' : 'Tarayıcı izin vermedi; adresi elle seçip kopyalayın.', alertOnly: true });
  if (navigator.clipboard?.writeText && window.isSecureContext) {
    navigator.clipboard.writeText(metin).then(() => bildir(true)).catch(() => bildir(false));
  } else bildir(false);
}

/* Tanınmayan bir adı, seçilen resmi firmaya bağlar. */
export function adiEsle(hamAd, hedefFirma) {
  state.firmAliases = state.firmAliases || {};
  state.firmAliases[firmaAnahtar(hamAd)] = hedefFirma;
  saveState(); render();
}

export function adiFirmaYap(hamAd) {
  const ad = normalizeName(hamAd);
  if (!ad) return;
  if (!state.firms.some(f => firmaAnahtar(f) === firmaAnahtar(ad))) state.firms.push(ad);
  state.firms.sort((a, b) => a.localeCompare(b, 'tr'));
  saveState(); render();
}

/* Taleplerde geçen tüm firmaları, esas adlarına göre sayar. */
export function firmaListesi() {
  const m = new Map();
  state.requests.forEach(r => {
    [r.from, r.to].forEach(ad => {
      const e = esasAd(ad);
      const k = upper(e);
      if (!m.has(k)) m.set(k, { ad: e, sayi: 0, varyantlar: new Set() });
      const kayit = m.get(k);
      kayit.sayi++;
      if (normalizeName(ad) !== e) kayit.varyantlar.add(normalizeName(ad));
    });
  });
  return [...m.values()].sort((a, b) => a.ad.localeCompare(b.ad, 'tr'));
}

/* Birbirine benzeyen ama henüz birleştirilmemiş adları bulur. */
export function benzerGruplar(esik = 0.82) {
  const adlar = firmaListesi().map(f => f.ad);
  const anahtarlar = adlar.map(firmaAnahtar);
  const kullanildi = new Set();
  const gruplar = [];
  for (let i = 0; i < adlar.length; i++) {
    if (kullanildi.has(i)) continue;
    const grup = [adlar[i]];
    for (let j = i + 1; j < adlar.length; j++) {
      if (kullanildi.has(j)) continue;
      const bir = anahtarlar[i], iki = anahtarlar[j];
      const yakin = bir === iki || benzerlik(bir, iki) >= esik ||
                    (bir.length > 3 && iki.length > 3 && (bir.startsWith(iki) || iki.startsWith(bir)));
      if (yakin) { grup.push(adlar[j]); kullanildi.add(j); }
    }
    if (grup.length > 1) { kullanildi.add(i); gruplar.push(grup); }
  }
  return gruplar;
}

/* Bir grubu tek bir esas ada bağlar. */
export function firmalariBirlestir(adlar, esas) {
  state.firmAliases = state.firmAliases || {};
  adlar.forEach(a => { state.firmAliases[firmaAnahtar(a)] = esas; });
  saveState();
}
