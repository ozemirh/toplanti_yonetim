/* ============================================================
   MASA KARTI (ızgara görünümü + takip ekranı ortak parçası)
   ============================================================ */
import { esc, fmtClock, fmtCounter } from '../utils.js';
import { liveOf, currentMeeting, nextMeeting, tableMeetings } from '../scheduling.js';
import { renkOf } from '../timers.js';

export function tableCardHtml(t, follow) {
  const L = liveOf(t.id);
  const m = currentMeeting(t.id);
  const n = nextMeeting(t.id);
  const list = tableMeetings(t.id);
  const bitti = L.index >= list.length && list.length > 0;
  const cls = L.running && L.secondsLeft > 60 ? 'running' : (L.running && L.secondsLeft > 0 ? 'warn' : (L.secondsLeft <= 0 && L.ended ? 'over' : ''));

  const govde = !list.length
    ? `<div class="tc-body"><div class="empty-note">Bu masaya görüşme atanmadı</div></div>`
    : bitti
      ? `<div class="tc-body"><div class="tc-label">Tamamlandı</div><div class="tc-pair">Bu masadaki tüm görüşmeler bitti</div></div>`
      : `<div class="tc-body">
           <div class="tc-label">Görüşen Firmalar</div>
           <div class="tc-pair">${esc(m.from)}<br>↔<br>${esc(m.to)}</div>
           <div class="tc-label">Kalan Süre</div>
           <div class="tc-time" data-timer="${t.id}" style="color:${renkOf(L.secondsLeft, L.running)}">${fmtCounter(L.secondsLeft)}</div>
           <div class="tc-next">
             ${n ? `Sıradaki: <b>${esc(n.from)} ↔ ${esc(n.to)}</b> · ${fmtClock(n.start)}` : 'Bu masada son görüşme'}
           </div>
         </div>`;

  const eylemler = follow || !list.length || bitti ? '' : `
    <div class="tc-actions">
      <button type="button" class="green" onclick="baslat('${t.id}')" ${L.running ? 'disabled' : ''}>▶ BAŞLAT</button>
      <button type="button" class="red" onclick="durdur('${t.id}')" ${!L.running ? 'disabled' : ''}>⏸ DURDUR</button>
      <button type="button" class="ghost small" onclick="sifirla('${t.id}')">↺ SÜREYİ SIFIRLA</button>
      <button type="button" class="yellow small" onclick="sonraki('${t.id}')">▶▶ SIRADAKİ</button>
    </div>`;

  const ilerleme = list.length ? `${Math.min(L.index + 1, list.length)}/${list.length}` : '0';
  return `
    <div class="table-card ${cls}" data-card="${t.id}">
      <div class="tc-head"><span>${esc(t.title)}</span><span class="status-pill">${ilerleme}</span></div>
      ${govde}${eylemler}
    </div>`;
}
