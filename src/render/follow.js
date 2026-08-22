/* ============================================================
   TAKİP EKRANI (fullscreen genel görüntüleme)
   ============================================================ */
import { state } from '../store.js';
import { esc } from '../utils.js';
import { liveOf, tableMeetings } from '../scheduling.js';
import { startTicking } from '../timers.js';
import { tableCardHtml } from './tableCard.js';
import { startPolling } from './polling.js';

export function renderFollow() {
  document.body.style.overflow = 'auto';
  const bitmis = state.schedule.filter(s => {
    const L = liveOf(s.tableId); const list = tableMeetings(s.tableId);
    return list.indexOf(s) < L.index;
  }).length;
  document.getElementById('app').innerHTML = `
    <main class="follow-screen">
      <section class="topbar">
        <h1>${esc(state.eventName || 'B2B Görüşme Programı')}</h1>
        <div class="row" style="flex:0 0 auto;align-items:center">
          <div class="follow-progress">Tamamlanan: ${bitmis} / ${state.schedule.length}</div>
          <button type="button" class="secondary small" onclick="closeFollow()">← KONTROL PANELİ</button>
        </div>
      </section>
      <div class="tables-grid">${state.tables.map(t => tableCardHtml(t, true)).join('')}</div>
    </main>`;
  startTicking();
  startPolling();
}
