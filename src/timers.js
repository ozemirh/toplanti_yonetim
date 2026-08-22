/* ============================================================
   SAYAÇ VE SESLİ ANONS
   ============================================================ */
import { state, saveState } from './store.js';
import { fmtCounter } from './utils.js';
import { liveOf, currentMeeting, nextMeeting, tableMeetings } from './scheduling.js';
import { openModal } from './render/modal.js';
import { render } from './render/router.js';

export let sesAcik = false;
let tickTimer = null;

export function konus(metin) {
  if (!sesAcik || !('speechSynthesis' in window)) return;
  try {
    const u = new SpeechSynthesisUtterance(metin);
    u.lang = 'tr-TR'; u.rate = 0.95; u.volume = 1;
    speechSynthesis.speak(u);
  } catch (e) { /* ses yoksa sessizce geç */ }
}

export function sesiAc() {
  if (!('speechSynthesis' in window)) {
    openModal({ title: 'Ses Desteklenmiyor', message: 'Bu tarayıcı sesli anonsu desteklemiyor. Chrome veya Edge kullanmayı deneyin.', alertOnly: true });
    return;
  }
  sesAcik = true;
  // Tarayıcılar ilk konuşmayı kullanıcı etkileşimine bağlar; burada tetikleniyor.
  konus('Sesli anons etkinleştirildi.');
  render();
}

export function startTicking() {
  if (tickTimer) return;
  tickTimer = setInterval(() => {
    let degisti = false;
    state.tables.forEach(t => {
      const L = liveOf(t.id);
      if (!L.running) return;
      L.secondsLeft -= 1;
      degisti = true;

      const m = currentMeeting(t.id);
      if (!m) return;

      if (!L.warned && L.secondsLeft <= 60 && L.secondsLeft > 0) {
        L.warned = true;
        konus(`${t.title}. ${m.from} ve ${m.to} firmaları, sürenizin dolmasına 1 dakika kalmıştır.`);
      }
      if (!L.ended && L.secondsLeft <= 0) {
        L.ended = true;
        L.running = false;
        const n = nextMeeting(t.id);
        let metin = `${t.title}. ${m.from} ve ${m.to} firmalarının görüşme süresi dolmuştur.`;
        if (n) metin += ` Sırada ${n.from} ve ${n.to} firmaları var. Lütfen ${t.title} masasına geçiniz.`;
        konus(metin);
      }
    });
    if (degisti) { saveState(); refreshCounters(); }
  }, 1000);
}

export function stopTicking() { if (tickTimer) { clearInterval(tickTimer); tickTimer = null; } }

export function baslat(tableId) {
  const L = liveOf(tableId), m = currentMeeting(tableId);
  if (!m) return;
  if (L.secondsLeft <= 0 || L.ended) { L.secondsLeft = m.duration * 60; L.warned = false; L.ended = false; }
  L.running = true;
  saveState(); render();
}
export function durdur(tableId) { liveOf(tableId).running = false; saveState(); render(); }
export function sifirla(tableId) {
  const L = liveOf(tableId), m = currentMeeting(tableId);
  L.secondsLeft = m ? m.duration * 60 : 0; L.warned = false; L.ended = false; L.running = false;
  saveState(); render();
}
export function sonraki(tableId) {
  const L = liveOf(tableId), list = tableMeetings(tableId);
  if (L.index >= list.length - 1) { L.index = list.length; L.running = false; L.secondsLeft = 0; saveState(); render(); return; }
  L.index += 1;
  const m = currentMeeting(tableId);
  L.secondsLeft = m ? m.duration * 60 : 0;
  L.warned = false; L.ended = false; L.running = false;
  saveState(); render();
}

export function renkOf(sec, running) {
  if (sec <= 0) return 'var(--red)';
  if (sec <= 60) return 'var(--yellow)';
  return running ? 'var(--green)' : 'var(--gray)';
}

/* Sayaç yazılarını tam yeniden çizim yapmadan günceller. */
export function refreshCounters() {
  state.tables.forEach(t => {
    const L = liveOf(t.id);
    const el = document.querySelector(`[data-timer="${t.id}"]`);
    if (el) { el.textContent = fmtCounter(L.secondsLeft); el.style.color = renkOf(L.secondsLeft, L.running); }
    const card = document.querySelector(`[data-card="${t.id}"]`);
    if (card) {
      card.classList.toggle('running', L.running && L.secondsLeft > 60);
      card.classList.toggle('warn', L.running && L.secondsLeft <= 60 && L.secondsLeft > 0);
      card.classList.toggle('over', L.secondsLeft <= 0 && L.ended);
    }
  });
}
