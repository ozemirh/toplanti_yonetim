/* ============================================================
   SALON PLANI — sürükle-bırak yerleşim
   Masalar, canlı durumlarını (sayaç, firma adları) koruyarak fiziksel
   salon düzenine göre serbestçe konumlandırılabilir. Yalnızca kontrol
   panelinde kullanılır; takip ekranı sade ızgarayı kullanmaya devam
   eder.
   ============================================================ */
import { state, saveState } from '../store.js';
import { esc, fmtCounter, normalizeName, makeId } from '../utils.js';
import { liveOf, currentMeeting, tableMeetings } from '../scheduling.js';
import { renkOf } from '../timers.js';
import { openModal } from './modal.js';
import { render } from './router.js';
import { removeTable } from '../tables.js';

export let layoutView = false;   // false=liste (ızgara), true=salon planı
export let editMode = false;     // salon planında sürükleyerek konum değiştirme
let hallSelection = null;        // {type:'table'|'shape', id} — salon planında seçili öğe

export function getHallSelection() { return hallSelection; }
export function setHallSelection(v) { hallSelection = v; }

export function toggleLayoutView() {
  layoutView = !layoutView;
  if (!layoutView) { editMode = false; hallSelection = null; }
  render();
}

export function toggleEditMode() {
  editMode = !editMode;
  if (!editMode) hallSelection = null;
  render();
}

function hallCardHtml(t) {
  const L = liveOf(t.id);
  const m = currentMeeting(t.id);
  const list = tableMeetings(t.id);
  const bitti = L.index >= list.length && list.length > 0;
  const cls = L.running && L.secondsLeft > 60 ? 'running' : (L.running && L.secondsLeft > 0 ? 'warn' : (L.secondsLeft <= 0 && L.ended ? 'over' : ''));
  const stil = `left:${t.x}%;top:${t.y}%;width:${t.w}%;height:${t.h}%;`;

  const govde = !list.length
    ? `<div class="tc-body"><div class="empty-note">Görüşme yok</div></div>`
    : bitti
      ? `<div class="tc-body"><div class="tc-label">Tamamlandı</div></div>`
      : `<div class="tc-body">
           <div class="tc-pair"><span class="tc-firm" title="${esc(m.from)}">${esc(m.from)}</span><span class="tc-sep">↔</span><span class="tc-firm" title="${esc(m.to)}">${esc(m.to)}</span></div>
           <div class="tc-time" data-timer="${t.id}" style="color:${renkOf(L.secondsLeft, L.running)}">${fmtCounter(L.secondsLeft)}</div>
         </div>`;

  const eylemler = (editMode || !list.length || bitti) ? '' : `
    <div class="tc-actions">
      <button type="button" class="green" onclick="baslat('${t.id}')" ${L.running ? 'disabled' : ''}>▶</button>
      <button type="button" class="red" onclick="durdur('${t.id}')" ${!L.running ? 'disabled' : ''}>⏸</button>
      <button type="button" class="yellow" onclick="sonraki('${t.id}')">▶▶</button>
    </div>`;

  const secili = editMode && hallSelection && hallSelection.type === 'table' && hallSelection.id === t.id;
  return `
    <div class="hall-card table-card ${cls} ${editMode ? 'draggable' : ''} ${secili ? 'selected' : ''}" data-card="${t.id}" data-hall-id="${t.id}" style="${stil}">
      <div class="tc-head">${esc(t.title)}</div>
      ${govde}${eylemler}
    </div>`;
}

function shapeHtml(sh) {
  const stil = `left:${sh.x}%;top:${sh.y}%;width:${sh.w}%;height:${sh.h}%;`;
  const secili = editMode && hallSelection && hallSelection.type === 'shape' && hallSelection.id === sh.id;
  return `
    <div class="hall-shape ${sh.kind} ${editMode ? 'draggable' : ''} ${secili ? 'selected' : ''}" data-shape-id="${sh.id}" style="${stil}">
      <span class="hall-shape-label">${esc(sh.label)}</span>
    </div>`;
}

/* Salon planına dikdörtgen/daire/not şeklinde dekoratif bir öğe
   ekler (sahne, giriş, bekleme alanı vb. işaretlemek için). Bu
   öğeler görüşme eşleştirmesini hiçbir şekilde etkilemez. */
export function addShape(kind) {
  const varsayilan = kind === 'circle' ? 'ALAN' : kind === 'note' ? 'NOT' : 'SAHNE';
  openModal({
    title: kind === 'circle' ? 'Daire Ekle' : kind === 'note' ? 'Not Ekle' : 'Dikdörtgen Ekle',
    message: 'Üzerinde görünecek kısa metni girin:',
    showInput: true, inputValue: varsayilan, confirmText: 'EKLE',
    onConfirm: (deger) => {
      const etiket = normalizeName(deger) || varsayilan;
      const sayi = state.shapes.length;
      const boyut = kind === 'circle' ? { w: 12, h: 14 } : kind === 'note' ? { w: 16, h: 9 } : { w: 20, h: 12 };
      state.shapes.push({
        id: makeId('sh'), kind, label: etiket,
        x: 6 + (sayi % 4) * 22, y: 74 + Math.floor(sayi / 4) * 16,
        ...boyut
      });
      saveState(); render();
    }
  });
}

export function removeShape(id) {
  state.shapes = state.shapes.filter(s => s.id !== id);
  saveState(); render();
}

export function renderHallCanvas() {
  return `
    <div class="hall-canvas" id="hallCanvas">
      ${state.shapes.map(shapeHtml).join('')}
      ${state.tables.map(hallCardHtml).join('')}
    </div>`;
}

/* Fare/dokunma ile sürükleyerek masa/şekil konumunu değiştirir.
   Konumlar %2'lik adımlarla ızgaraya yapışır ve tuval sınırları
   içinde tutulur. Masalar ve şekiller aynı sürükleme mantığını
   paylaşır; hangi diziye ait olduğu veri kümesi ile belirlenir. */
export function bindHallDragging() {
  const canvas = document.getElementById('hallCanvas');
  if (!canvas || !editMode) return;

  const surukleBagla = (el, veri, tur) => {
    el.addEventListener('pointerdown', (ev) => {
      ev.preventDefault();
      const canvasRect = canvas.getBoundingClientRect();
      const basY = ev.clientY, basX = ev.clientX;
      const oncekiX = veri.x, oncekiY = veri.y;
      el.setPointerCapture(ev.pointerId);
      el.classList.add('taken');

      const hareket = (mv) => {
        const dx = ((mv.clientX - basX) / canvasRect.width) * 100;
        const dy = ((mv.clientY - basY) / canvasRect.height) * 100;
        let nx = oncekiX + dx, ny = oncekiY + dy;
        nx = Math.round(nx / 2) * 2; ny = Math.round(ny / 2) * 2;
        nx = Math.max(0, Math.min(100 - veri.w, nx));
        ny = Math.max(0, Math.min(100 - veri.h, ny));
        veri.x = nx; veri.y = ny;
        el.style.left = nx + '%'; el.style.top = ny + '%';
      };
      const birak = (up) => {
        el.classList.remove('taken');
        el.removeEventListener('pointermove', hareket);
        el.removeEventListener('pointerup', birak);
        // Sürükleme ile tıklama, bırakılan noktanın başlangıca olan
        // GERÇEK uzaklığıyla ayırt edilir (ara titremeler değil).
        // Eşik, gerçek fare/trackpad kullanımına toleranslı olacak
        // şekilde geniş tutulur (8px).
        const uzaklik = Math.hypot(up.clientX - basX, up.clientY - basY);
        if (uzaklik > 8) {
          saveState();
        } else {
          veri.x = oncekiX; veri.y = oncekiY;   // ufak titremeyi geri al
          hallSelection = { type: tur, id: veri.id };
          render();
        }
      };
      el.addEventListener('pointermove', hareket);
      el.addEventListener('pointerup', birak);
    });
  };

  canvas.querySelectorAll('.hall-card').forEach((el) => {
    const t = state.tables.find(x => x.id === el.dataset.hallId);
    if (t) surukleBagla(el, t, 'table');
  });
  canvas.querySelectorAll('.hall-shape').forEach((el) => {
    const sh = state.shapes.find(x => x.id === el.dataset.shapeId);
    if (sh) surukleBagla(el, sh, 'shape');
  });

  // Tuvalin boş bir noktasına tıklanırsa seçim kaldırılır.
  canvas.addEventListener('pointerdown', (ev) => {
    if (ev.target === canvas && hallSelection) { hallSelection = null; render(); }
  });
}

export function deleteSelectedHallItem() {
  if (!hallSelection) return;
  if (hallSelection.type === 'table') {
    removeTable(hallSelection.id);   // onay penceresi kendi içinde hallSelection'ı temizler
  } else {
    const id = hallSelection.id;
    hallSelection = null;
    removeShape(id);
  }
}
