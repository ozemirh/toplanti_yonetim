/* ============================================================
   MASA KARTI (ızgara görünümü + takip ekranı ortak parçası)
   ============================================================ */
import { esc, fmtClock, fmtCounter } from '../utils.js';
import { liveOf, currentMeeting, nextMeeting, tableMeetings } from '../scheduling.js';
import { renkOf } from '../timers.js';

/* Kartın alt satırı — sıradaki görüşmeyi özetler.
   Takip ekranında (follow) bu satır tıklanabilir bir düğmedir:
   masanın tüm görüşme sırasını modal olarak açar. Kontrol
   panelinde ise düz metin kalır; oradaki program tablosu
   zaten aynı bilgiyi gösteriyor. */
function nextHtml(t, n, follow) {
  const ozet = n
    ? `Sıradaki: <b class="tc-next-firms" title="${esc(n.from)} ↔ ${esc(n.to)}">${esc(n.from)} ↔ ${esc(n.to)}</b> · ${fmtClock(n.start)}`
    : 'Bu masada son görüşme';
  if (!follow) return `<div class="tc-next">${ozet}</div>`;
  return `<button type="button" class="tc-next tc-next-btn" onclick="masaProgramiGoster('${t.id}')"
            title="${esc(t.title)} masasının tüm görüşme sırasını göster"><span class="tc-next-text">${ozet}</span><span class="tc-next-more">▸ tümü</span></button>`;
}

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
           <div class="tc-pair"><span class="tc-firm" title="${esc(m.from)}">${esc(m.from)}</span><span class="tc-sep">↔</span><span class="tc-firm" title="${esc(m.to)}">${esc(m.to)}</span></div>
           <div class="tc-label">Kalan Süre</div>
           <div class="tc-time" data-timer="${t.id}" style="color:${renkOf(L.secondsLeft, L.running)}">${fmtCounter(L.secondsLeft)}</div>
           ${nextHtml(t, n, follow)}
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
