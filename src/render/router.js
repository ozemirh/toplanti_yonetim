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
  if (p && !p.closed) return;
  openModal({
    title: 'Takip Ekranı', message: 'Tarayıcı yeni sekme açmayı engelledi. Bu sekmede açılsın mı?',
    confirmText: 'BU SEKMEDE AÇ',
    onConfirm: () => { location.hash = '#takip'; applyRoute(); }
  });
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
