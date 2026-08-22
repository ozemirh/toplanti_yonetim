/* ============================================================
   OTOMATİK SENKRONİZASYON
   Yanıt tablosu, Apps Script'in JSONP uç noktasından düzenli
   aralıklarla çekilir. Çapraz kaynak kısıtı nedeniyle fetch yerine
   <script> etiketi enjeksiyonu kullanılır (klasik JSONP yöntemi).
   ============================================================ */
import { state, saveState } from './store.js';
import { parseSheetRows } from './importRequests.js';
import { otomatikProgramGuncelle } from './scheduling.js';
import { sheetIdCoz } from './googleForms.js';
import { render } from './render/router.js';

let syncTimer = null;
let syncCekimSurmekte = false;

function senkronDurumMesaji(metin, hataMi) {
  const el = document.getElementById('syncStatus');
  if (!el) return;
  el.textContent = metin;
  el.style.color = hataMi ? 'var(--red)' : 'var(--green)';
}

export function senkronCek(sessiz) {
  const adres = String(state.webAppUrl || '').trim();
  if (!/^https:\/\/script\.google\.com\/.+\/exec/.test(adres)) return;
  if (syncCekimSurmekte) return;
  syncCekimSurmekte = true;

  const cbAdi = 'b2bSync_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const zamanAsimi = setTimeout(() => {
    delete window[cbAdi];
    betikEl.remove();
    syncCekimSurmekte = false;
    if (!sessiz) senkronDurumMesaji('Yanıt alınamadı (zaman aşımı)', true);
  }, 12000);

  window[cbAdi] = (yuk) => {
    clearTimeout(zamanAsimi);
    delete window[cbAdi];
    betikEl.remove();
    syncCekimSurmekte = false;

    if (!yuk || yuk.error) {
      if (!sessiz) senkronDurumMesaji('Tablo okunamadı: ' + (yuk?.error || 'bilinmeyen hata'), true);
      return;
    }
    if (!yuk.headers?.length) {
      senkronDurumMesaji('Henüz yanıt yok — bekleniyor…', false);
      return;
    }

    const oncekiSayi = state.lastSyncCount || 0;
    const yeniSatirlar = yuk.rows.slice(oncekiSayi);
    state.lastSyncCount = yuk.rows.length;

    if (!yeniSatirlar.length) {
      senkronDurumMesaji(`Güncel — ${yuk.rows.length} yanıt (son kontrol ${new Date().toLocaleTimeString('tr-TR').slice(0,5)})`, false);
      saveState();
      return;
    }

    const kayitlar = parseSheetRows(yuk.headers, yeniSatirlar);
    kayitlar.forEach(r => state.requests.push(r));
    const yeniYerlesti = otomatikProgramGuncelle();
    saveState(); render();
    const ekBilgi = yeniYerlesti ? ' — masalara otomatik dağıtıldı' : '';
    senkronDurumMesaji(`${kayitlar.length} yeni talep alındı${ekBilgi} (toplam ${yuk.rows.length} yanıt)`, false);
  };

  const parcalar = [adres + '?action=veri&callback=' + cbAdi];
  const sid = sheetIdCoz(state.sheetId);
  if (sid) parcalar.push('sheetId=' + encodeURIComponent(sid));
  const betikEl = document.createElement('script');
  betikEl.src = parcalar[0] + '&' + parcalar.slice(1).join('&');
  betikEl.onerror = () => {
    clearTimeout(zamanAsimi);
    delete window[cbAdi];
    betikEl.remove();
    syncCekimSurmekte = false;
    if (!sessiz) senkronDurumMesaji('Bağlantı kurulamadı', true);
  };
  document.body.appendChild(betikEl);
}

export function senkronBaslat() {
  if (syncTimer) return;
  senkronCek(true);
  syncTimer = setInterval(() => senkronCek(true), 20000);
}
export function senkronDurdur() {
  if (syncTimer) { clearInterval(syncTimer); syncTimer = null; }
}

export function toggleAutoSync(acik) {
  state.autoSync = !!acik;
  saveState();
  if (state.autoSync) { senkronBaslat(); senkronCek(false); }
  else senkronDurdur();
  render();
}
