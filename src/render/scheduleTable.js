/* ============================================================
   PROGRAM TABLOSU / TALEP LİSTESİ
   ============================================================ */
import { state } from '../store.js';
import { esc, fmtClock } from '../utils.js';
import { liveOf, tableMeetings } from '../scheduling.js';
import { openModal } from './modal.js';

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

/* Tek bir masanın tüm görüşme sırasını modal olarak gösterir.
   Takip ekranındaki "Sıradaki" düğmesinden çağrılır; salondaki
   görevli/firmalar o masanın kalan programını görebilsin diye. */
export function masaProgramiGoster(tableId) {
  const masa = state.tables.find(t => t.id === tableId);
  const list = tableMeetings(tableId);
  const L = liveOf(tableId);

  const govde = !list.length
    ? `<div class="empty-note">Bu masaya görüşme atanmadı</div>`
    : `<div class="sched" style="max-height:60vh"><table>
        <thead><tr><th>Saat</th><th>Firmalar</th><th>Süre</th><th>Durum</th></tr></thead>
        <tbody>${list.map((s, i) => {
          const durum = i < L.index ? 'done' : (i === L.index ? 'now' : '');
          const etiket = i < L.index ? 'Tamamlandı' : (i === L.index ? 'Görüşülüyor' : 'Bekliyor');
          return `<tr class="${durum}">
            <td class="clock">${fmtClock(s.start)}–${fmtClock(s.end)}</td>
            <td class="pair">${esc(s.from)} ↔ ${esc(s.to)}${s.mutual ? '<span class="badge">karşılıklı</span>' : ''}</td>
            <td>${s.duration} dk</td>
            <td>${etiket}</td>
          </tr>`;
        }).join('')}</tbody></table></div>`;

  openModal({
    title: `${masa?.title || 'Masa'} — Görüşme Sırası`,
    wide: true, alertOnly: true, confirmText: 'KAPAT',
    bodyHtml: govde
  });
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
