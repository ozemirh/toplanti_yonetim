/* ============================================================
   PROGRAM TABLOSU / TALEP LİSTESİ
   ============================================================ */
import { state } from '../store.js';
import { esc, fmtClock } from '../utils.js';
import { liveOf, tableMeetings } from '../scheduling.js';

export function scheduleTableHtml() {
  if (!state.schedule.length) return `<div class="empty-note">Henüz program oluşturulmadı</div>`;
  const satirlar = state.schedule.map(s => {
    const L = liveOf(s.tableId);
    const list = tableMeetings(s.tableId);
    const idx = list.findIndex(x => x === s);
    const durum = idx < L.index ? 'done' : (idx === L.index ? 'now' : '');
    return `<tr class="${durum}">
      <td class="clock">${fmtClock(s.start)}–${fmtClock(s.end)}</td>
      <td>${esc(s.tableTitle)}</td>
      <td class="pair">${esc(s.from)} ↔ ${esc(s.to)}${s.mutual ? '<span class="badge">karşılıklı</span>' : ''}</td>
      <td>${s.duration} dk</td>
    </tr>`;
  }).join('');
  return `<div class="sched"><table>
    <thead><tr><th>Saat</th><th>Masa</th><th>Firmalar</th><th>Süre</th></tr></thead>
    <tbody>${satirlar}</tbody></table></div>`;
}

export function requestListHtml() {
  if (!state.requests.length) return `<div class="empty-note">Henüz talep yok</div>`;
  const satirlar = state.requests.map((r, i) => `<tr>
    <td class="clock">${i + 1}</td>
    <td class="pair">${esc(r.from)} → ${esc(r.to)}</td>
    <td>${r.duration} dk</td>
    <td style="text-align:right"><button type="button" class="small red" onclick="removeRequest('${r.id}')">×</button></td>
  </tr>`).join('');
  return `<div class="sched" style="max-height:300px"><table>
    <thead><tr><th>#</th><th>Talep</th><th>Süre</th><th></th></tr></thead>
    <tbody>${satirlar}</tbody></table></div>`;
}
