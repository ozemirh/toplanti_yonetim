/* ============================================================
   TALEP İÇE AKTARMA
   Google Forms yanıt tablosundan yapıştırılan/çekilen metni
   görüşme taleplerine çevirir.
   ============================================================ */
import { state, saveState } from './store.js';
import { normalizeName, upper, firmaAnahtar, makeId } from './utils.js';
import { openModal } from './render/modal.js';
import { render } from './render/router.js';

/* Onay kutulu sorularda Google Forms birden çok seçimi tek hücrede
   virgülle birleştirir ("TUSAŞ, BAYKAR"). Firma adlarının kendisi de
   virgül içerebildiği için önce resmi listedeki adlar aranır; liste
   yoksa virgül/noktalı virgülle bölünür. */
export function parseMultiFirms(cell) {
  const ham = normalizeName(cell);
  if (!ham) return [];

  if ((state.firms || []).length) {
    const metin = ' ' + firmaAnahtar(ham) + ' ';
    const bulunan = [];
    // Uzun adlar önce denenir ki kısa bir ad uzunun içinde eşleşmesin
    [...state.firms].sort((a, b) => firmaAnahtar(b).length - firmaAnahtar(a).length).forEach(f => {
      const k = firmaAnahtar(f);
      if (!k) return;
      if (metin.includes(' ' + k + ' ') && !bulunan.includes(f)) bulunan.push(f);
    });
    if (bulunan.length) return bulunan;
  }

  return ham.split(/\s*[;,]\s*/).map(normalizeName).filter(Boolean);
}

export function parseRequestTable(text) {
  const satirlar = String(text || '').split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  if (!satirlar.length) return { rows: [], error: 'Boş içerik' };

  const bol = (s) => s.includes('\t') ? s.split('\t') : s.split(/\s*;\s*|\s*,\s*(?=(?:[^"]*"[^"]*")*[^"]*$)/);
  const basliklar = bol(satirlar[0]).map(h => h.replace(/^"|"$/g, '').trim().toLocaleLowerCase('tr'));

  const bul = (...anahtarlar) => basliklar.findIndex(h => anahtarlar.some(a => h.includes(a)));
  let iFrom = bul('talep eden', 'firma adı', 'firmanız', 'kendi firma', 'talepte bulunan');
  let iTo = bul('görüşmek', 'görüşülecek', 'talep edilen', 'hedef firma', 'karşı firma');
  let iDur = bul('süre', 'dakika');
  let iTime = bul('zaman damgası', 'timestamp', 'tarih');

  const basliklıMi = iFrom >= 0 && iTo >= 0;
  const veriSatirlari = basliklıMi ? satirlar.slice(1) : satirlar;
  if (!basliklıMi) { iTime = 0; iFrom = 1; iTo = 2; iDur = 3; } // başlıksız: sabit sıra

  const rows = [];
  veriSatirlari.forEach((satir, i) => {
    const h = bol(satir).map(v => v.replace(/^"|"$/g, '').trim());
    const from = normalizeName(h[iFrom]);
    const hedefler = parseMultiFirms(h[iTo]);
    if (!from || !hedefler.length) return;
    const sureHam = iDur >= 0 ? String(h[iDur] || '').match(/\d+/) : null;
    const sure = sureHam ? Math.max(1, Number(sureHam[0])) : state.defaultDuration;
    // Tek gönderimde birden çok firma seçilmişse her biri ayrı talep olur
    hedefler.forEach(to => rows.push({
      id: makeId('r'), from, to, duration: sure,
      createdAt: iTime >= 0 ? String(h[iTime] || '') : '',
      order: i
    }));
  });

  return { rows, headerFound: basliklıMi };
}

/* Tablo satırlarını (başlık + veri dizileri) taleplere çevirir.
   parseRequestTable ile aynı sütun tanıma mantığını kullanır. */
export function parseSheetRows(headers, rows) {
  const normBaslik = headers.map(h => String(h || '').toLocaleLowerCase('tr'));
  const bul = (...anahtarlar) => normBaslik.findIndex(h => anahtarlar.some(a => h.includes(a)));
  const iFrom = bul('talep eden', 'firma adı', 'firmanız', 'kendi firma', 'talepte bulunan');
  const iTo = bul('görüşmek', 'görüşülecek', 'talep edilen', 'hedef firma', 'karşı firma');
  const iDur = bul('süre', 'dakika');
  const iTime = bul('zaman damgası', 'timestamp', 'tarih');
  if (iFrom < 0 || iTo < 0) return [];

  const sonuc = [];
  rows.forEach((r) => {
    const from = normalizeName(r[iFrom]);
    const hedefler = parseMultiFirms(r[iTo]);
    if (!from || !hedefler.length) return;
    const sureHam = iDur >= 0 ? String(r[iDur] || '').match(/\d+/) : null;
    const sure = sureHam ? Math.max(1, Number(sureHam[0])) : state.defaultDuration;
    hedefler.forEach(to => sonuc.push({
      id: makeId('r'), from, to, duration: sure,
      createdAt: iTime >= 0 ? String(r[iTime] || '') : '',
      order: state.requests.length + sonuc.length
    }));
  });
  return sonuc;
}

export function importRequests() {
  const kutu = document.getElementById('importBox');
  const { rows, headerFound } = parseRequestTable(kutu?.value || '');
  if (!rows.length) {
    openModal({ title: 'İçe Aktarılamadı', message: 'Tabloda geçerli satır bulunamadı. En az "talep eden firma" ve "görüşülecek firma" sütunları olmalı.', alertOnly: true });
    return;
  }
  const baslangic = state.requests.length;
  rows.forEach((r, i) => { r.order = baslangic + i; state.requests.push(r); });
  if (kutu) kutu.value = '';
  saveState(); render();
  openModal({
    title: 'İçe Aktarıldı',
    message: `${rows.length} talep eklendi.${headerFound ? '' : ' Başlık satırı bulunamadığı için sütunlar sırayla okundu (zaman, talep eden, görüşülecek, süre).'} Şimdi "PROGRAMI OLUŞTUR" ile masalara dağıtabilirsiniz.`,
    alertOnly: true
  });
}

export function addManualRequest() {
  const from = normalizeName(document.getElementById('mFrom')?.value);
  const to = normalizeName(document.getElementById('mTo')?.value);
  const dur = Math.max(1, Number(document.getElementById('mDur')?.value) || state.defaultDuration);
  if (!from || !to) { openModal({ title: 'Eksik Bilgi', message: 'İki firma adı da girilmelidir.', alertOnly: true }); return; }
  if (upper(from) === upper(to)) { openModal({ title: 'Geçersiz', message: 'Bir firma kendisiyle görüşme talebi oluşturamaz.', alertOnly: true }); return; }
  state.requests.push({ id: makeId('r'), from, to, duration: dur, order: state.requests.length, createdAt: new Date().toISOString() });
  ['mFrom', 'mTo'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  saveState(); render();
}

export function removeRequest(id) {
  state.requests = state.requests.filter(r => r.id !== id);
  saveState(); render();
}

export function clearRequests() {
  openModal({
    title: 'Talepleri Temizle', message: 'Tüm görüşme talepleri silinsin mi? Program da sıfırlanır.',
    confirmText: 'TEMİZLE', danger: true,
    onConfirm: () => { state.requests = []; state.schedule = []; state.unscheduled = []; state.live = {}; saveState(); render(); }
  });
}
