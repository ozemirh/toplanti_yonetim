/* ============================================================
   TAKİP EKRANI (salona yansıtılan genel görüntüleme)

   Varsayılan görünüm salon krokisidir: masalar fiziksel salon
   düzenindeki konumlarıyla çizilir; böylece firmalar hem sıralarını
   hem de masalarının salonun neresinde olduğunu görür. Krokiye
   sığmayan durumlar için sade ızgara görünümüne geçilebilir.
   ============================================================ */
import { state } from '../store.js';
import { esc } from '../utils.js';
import { liveOf, tableMeetings } from '../scheduling.js';
import { startTicking } from '../timers.js';
import { tableCardHtml } from './tableCard.js';
import { renderHallCanvas } from './hall.js';
import { startPolling } from './polling.js';
import { render } from './router.js';

let krokiGorunum = true;   // true=salon krokisi, false=ızgara

export function toggleFollowView() {
  krokiGorunum = !krokiGorunum;
  render();
}

export function renderFollow() {
  document.body.style.overflow = krokiGorunum ? 'hidden' : 'auto';
  const bitmis = state.schedule.filter(s => {
    const L = liveOf(s.tableId); const list = tableMeetings(s.tableId);
    return list.indexOf(s) < L.index;
  }).length;

  document.getElementById('app').innerHTML = `
    <main class="follow-screen${krokiGorunum ? ' follow-kroki' : ''}">
      <section class="topbar">
        <h1>${esc(state.eventName || 'B2B Görüşme Programı')}</h1>
        <div class="row" style="flex:0 0 auto;align-items:center">
          <div class="follow-progress">Tamamlanan: ${bitmis} / ${state.schedule.length}</div>
          <button type="button" class="secondary small" onclick="toggleFollowView()">${krokiGorunum ? '≡ LİSTE' : '🗺 SALON KROKİSİ'}</button>
          <button type="button" class="secondary small" onclick="closeFollow()">← KONTROL PANELİ</button>
        </div>
      </section>
      ${krokiGorunum
        ? renderHallCanvas(true)
        : `<div class="tables-grid">${state.tables.map(t => tableCardHtml(t, true)).join('')}</div>`}
    </main>`;
  startTicking();
  startPolling();
}
