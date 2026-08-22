/* ============================================================
   EKRANLAR ARASI GEÇİŞ (basit hash tabanlı yönlendirme)
   ============================================================ */
import { state, setState, loadState } from '../store.js';
import { openModal } from './modal.js';
import { stopPolling } from './polling.js';
import { senkronBaslat, senkronDurdur } from '../sync.js';
import { renderControl } from './control.js';
import { renderFollow } from './follow.js';
import { renderQr } from './qr.js';

export let route = 'kontrol';

export function render() {
  if (route === 'takip') renderFollow();
  else if (route === 'qr') renderQr();
  else renderControl();
}

export function openFollow() {
  const url = `${location.href.split('#')[0]}#takip`;
  let p = null;
  try { p = window.open(url, '_blank'); } catch (e) { p = null; }
  const acilamadi = () => openModal({
    title: 'Takip Ekranı', message: 'Tarayıcı yeni sekme açmayı engelledi. Bu sekmede açılsın mı?',
    confirmText: 'BU SEKMEDE AÇ',
    onConfirm: () => { location.hash = '#takip'; applyRoute(); }
  });
  if (!p) { acilamadi(); return; }
  // Bazı tarayıcılar/uzantılar engellenen popup için de geçerli bir
  // pencere nesnesi döndürür ama sayfayı hiç yüklemez (about:blank'te
  // kalır) — bu yüzden .closed kontrolü tek başına güvenilir değil.
  // Kısa bir gecikmeyle sekmenin gerçekten adrese gittiğini doğrularız.
  setTimeout(() => {
    let yuklendi = true;
    try { yuklendi = !p.closed && p.location && /#takip/.test(p.location.href); } catch (e) { yuklendi = true; } // çapraz kaynak: farklı origin'e gitmiş, sorun yok say
    if (!yuklendi) { try { p.close(); } catch (e) {} acilamadi(); }
  }, 700);
}
export function closeFollow() { location.hash = ''; applyRoute(); }
export function openQr() { location.hash = '#qr'; applyRoute(); }
export function closeQr() { location.hash = ''; applyRoute(); }

export function applyRoute() {
  const h = (location.hash || '').toLowerCase();
  route = h === '#takip' ? 'takip' : (h === '#qr' ? 'qr' : 'kontrol');
  if (route !== 'takip') stopPolling();
  setState(loadState());
  if (route === 'kontrol' && state.autoSync) senkronBaslat();
  else senkronDurdur();
  render();
}
