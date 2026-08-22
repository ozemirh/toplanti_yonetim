/* ============================================================
   MASA YÖNETİMİ VE AYARLAR
   ============================================================ */
import { state, saveState, autoPosition } from './store.js';
import { normalizeName, makeId } from './utils.js';
import { buildSchedule } from './scheduling.js';
import { openModal } from './render/modal.js';
import { render } from './render/router.js';
import { getHallSelection, setHallSelection } from './render/hall.js';

export function addTable() {
  const pos = autoPosition(state.tables.length);
  state.tables.push({ id: makeId('t'), title: `MASA ${state.tables.length + 1}`, ...pos });
  saveState(); render();
}
export function removeTable(id) {
  if (state.tables.length <= 1) { openModal({ title: 'Silinemiyor', message: 'En az bir masa kalmalı.', alertOnly: true }); return; }
  const t = state.tables.find(x => x.id === id);
  const gorusmeSayisi = state.schedule.filter(s => s.tableId === id).length;
  openModal({
    title: 'Masayı Sil',
    message: gorusmeSayisi
      ? `${t?.title || 'Bu masa'} silinecek. Bu masaya atanmış ${gorusmeSayisi} görüşme programdan da kaldırılacak.`
      : `${t?.title || 'Bu masa'} silinsin mi?`,
    confirmText: 'SİL', danger: true,
    onConfirm: () => {
      state.tables = state.tables.filter(x => x.id !== id);
      state.schedule = state.schedule.filter(s => s.tableId !== id);
      delete state.live[id];
      const hs = getHallSelection();
      if (hs && hs.type === 'table' && hs.id === id) setHallSelection(null);
      saveState(); render();
    }
  });
}
export function renameTable(id, value) {
  const t = state.tables.find(x => x.id === id);
  if (t) { t.title = normalizeName(value) || t.title; saveState(); }
}

/* Salon planındaki tüm masaları ızgaraya göre yeniden dizer.
   Elle sürüklenerek bozulan düzeni toplu olarak düzeltmek için. */
export function resetLayout() {
  openModal({
    title: 'Yerleşimi Sıfırla',
    message: 'Masalar ızgaraya göre yeniden dizilsin mi? Görüşme programı ve sayaçlar etkilenmez.',
    confirmText: 'SIFIRLA', danger: true,
    onConfirm: () => {
      state.tables.forEach((t, i) => Object.assign(t, autoPosition(i, t.w, t.h)));
      saveState(); render();
    }
  });
}

export function applySettings() {
  const g = id => document.getElementById(id)?.value;
  state.eventName = normalizeName(g('setName'));
  state.formUrl = String(g('setForm') || '').trim();
  state.webAppUrl = String(g('setWebApp') || '').trim();
  if (/^\d{2}:\d{2}$/.test(String(g('setStart')))) state.startTime = g('setStart');
  if (/^\d{2}:\d{2}$/.test(String(g('setEnd')))) state.endTime = g('setEnd');
  state.defaultDuration = Math.max(1, Number(g('setDur')) || 15);
  saveState(); render();
}

export function generateSchedule() {
  if (!state.requests.length) { openModal({ title: 'Talep Yok', message: 'Önce görüşme taleplerini içe aktarın veya elle ekleyin.', alertOnly: true }); return; }
  buildSchedule();
  render();
  openModal({
    title: 'Program Oluşturuldu',
    message: `${state.schedule.length} görüşme masalara dağıtıldı.`,
    alertOnly: true
  });
}
