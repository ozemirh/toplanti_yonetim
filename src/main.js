/* ============================================================
   B2B GÖRÜŞME EŞLEŞTİRME SİSTEMİ — UYGULAMA BAŞLANGICI
   Akış: Firmalar QR ile Google Form doldurur → talepler tablo
   olarak içe aktarılır → planlayıcı görüşmeleri masalara dağıtır
   → etkinlik sırasında sayaç ve sesli anonslar yürütülür.

   Bu dosya, sayfadaki `onclick="..."` özniteliklerinin çağırdığı
   fonksiyonları `window` üzerine bağlar (uygulama render fonksiyonları
   HTML'i doğrudan dize olarak ürettiği için olay dinleyici eklemek
   yerine klasik satır-içi olay tutamaçları kullanılıyor — orijinal
   davranış aynen korunmuştur) ve uygulamayı başlatır.
   ============================================================ */
import './style.css';

import { loadState, setState } from './store.js';
import { applyRoute, render, openFollow, closeFollow, openQr, closeQr } from './render/router.js';
import { stopPolling } from './render/polling.js';
import { handleEmbedded, openShare } from './render/share.js';
import { qrHata, qrGorseliYukle, qrGorseliSil } from './render/qr.js';
import { deleteSelectedHallItem, renameSelectedHallItem, addShape, toggleLayoutView, toggleEditMode } from './render/hall.js';
import { masaProgramiGoster } from './render/scheduleTable.js';

import { sesiAc, baslat, durdur, sifirla, sonraki, stopTicking } from './timers.js';
import {
  addTable, removeTable, resetLayout, applySettings, generateSchedule
} from './tables.js';
import {
  firmaEkleToplu, firmaSil, firmaListesiniTemizle, firmaListesiniKopyala,
  adiEsle, adiFirmaYap, kopyala
} from './firmMatching.js';
import {
  formuOtomatikOlustur, webAppKurulum, applySheetId
} from './googleForms.js';
import {
  addManualRequest, removeRequest, clearRequests
} from './importRequests.js';
import { toggleAutoSync, senkronDurdur } from './sync.js';

/* ---------- Satır içi (onclick=) tutamaçlar için genel alana bağlama ---------- */
Object.assign(window, {
  // gezinme
  openFollow, closeFollow, openQr, closeQr, openShare,
  // sesli anons
  sesiAc,
  // sayaçlar
  baslat, durdur, sifirla, sonraki,
  // masa programı (takip ekranındaki "Sıradaki" düğmesi)
  masaProgramiGoster,
  // salon planı
  toggleLayoutView, toggleEditMode, addShape, deleteSelectedHallItem, renameSelectedHallItem,
  // masalar / ayarlar
  addTable, removeTable, resetLayout, applySettings, generateSchedule,
  // firmalar
  firmaEkleToplu, firmaSil, firmaListesiniTemizle, firmaListesiniKopyala,
  adiEsle, adiFirmaYap, kopyala,
  // google forms entegrasyonu
  formuOtomatikOlustur, webAppKurulum, applySheetId,
  // talepler
  addManualRequest, removeRequest, clearRequests,
  // senkronizasyon
  toggleAutoSync,
  // qr ekranı
  qrHata, qrGorseliYukle, qrGorseliSil
});

/* ---------- BAŞLAT ---------- */
setState(loadState());
handleEmbedded();
setState(loadState());
applyRoute();
window.addEventListener('hashchange', applyRoute);
window.addEventListener('beforeunload', () => { stopTicking(); stopPolling(); senkronDurdur(); });
