/* ============================================================
   TAKİP EKRANI YOKLAMASI
   Takip ekranı, kontrol panelindeki değişiklikleri yansıtır.
   ============================================================ */
import { state, setState, loadState } from '../store.js';
import { refreshCounters } from '../timers.js';
import { render } from './router.js';

let pollTimer = null;

export function startPolling() {
  if (pollTimer) return;
  pollTimer = setInterval(() => {
    const yeni = loadState();
    if (JSON.stringify(yeni.schedule) !== JSON.stringify(state.schedule) ||
        JSON.stringify(yeni.tables) !== JSON.stringify(state.tables)) {
      setState(yeni); render(); return;
    }
    // Sayaçlar kontrol panelinde işliyor; takip ekranı değerleri okur.
    state.live = yeni.live;
    refreshCounters();
  }, 1000);
}
export function stopPolling() { if (pollTimer) { clearInterval(pollTimer); pollTimer = null; } }
