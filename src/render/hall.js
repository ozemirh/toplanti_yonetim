/* ============================================================
   SALON PLANI (KROKİ) — sürükle-bırak yerleşim

   Masalar, canlı durumlarını (sayaç, firma adları) koruyarak fiziksel
   salon düzenine göre serbestçe konumlandırılabilir. Aynı kroki iki
   yerde kullanılır:
     • Kontrol panelinde — düzenlenebilir (sürükle, ekle, sil)
     • Takip ekranında  — salt okunur; firmalar masalarının salonun
       neresinde olduğunu buradan görür.
   ============================================================ */
import { state, saveState } from '../store.js';
import { esc, fmtClock, fmtCounter, normalizeName, makeId } from '../utils.js';
import { liveOf, currentMeeting, nextMeeting, tableMeetings } from '../scheduling.js';
import { renkOf } from '../timers.js';
import { openModal } from './modal.js';
import { render } from './router.js';
import { removeTable } from '../tables.js';
import { SEKIL_TIPLERI, SEKIL_GRUPLARI, sekilTipi } from '../shapeTypes.js';

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

/* follow=true → takip ekranı: kumanda düğmeleri gizlenir, bunun
   yerine masanın tüm sırasını açan "sıradaki" satırı gösterilir. */
function hallCardHtml(t, follow) {
  const L = liveOf(t.id);
  const m = currentMeeting(t.id);
  const n = nextMeeting(t.id);
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

  let alt = '';
  if (follow && list.length && !bitti) {
    const ozet = n ? `Sıradaki: ${esc(n.from)} ↔ ${esc(n.to)} · ${fmtClock(n.start)}` : 'Son görüşme';
    alt = `<button type="button" class="hall-next" onclick="masaProgramiGoster('${t.id}')"
             title="${esc(t.title)} — tüm görüşme sırası"><span class="hall-next-text">${ozet}</span><span class="tc-next-more">▸</span></button>`;
  } else if (!follow && !editMode && list.length && !bitti) {
    alt = `<div class="tc-actions">
      <button type="button" class="green" onclick="baslat('${t.id}')" ${L.running ? 'disabled' : ''}>▶</button>
      <button type="button" class="red" onclick="durdur('${t.id}')" ${!L.running ? 'disabled' : ''}>⏸</button>
      <button type="button" class="yellow" onclick="sonraki('${t.id}')">▶▶</button>
    </div>`;
  }

  const secili = editMode && hallSelection && hallSelection.type === 'table' && hallSelection.id === t.id;
  return `
    <div class="hall-card table-card ${cls} ${editMode ? 'draggable' : ''} ${secili ? 'selected' : ''}" data-card="${t.id}" data-hall-id="${t.id}" style="${stil}">
      <div class="tc-head">${esc(t.title)}</div>
      ${govde}${alt}
    </div>`;
}

function shapeHtml(sh) {
  const stil = `left:${sh.x}%;top:${sh.y}%;width:${sh.w}%;height:${sh.h}%;`;
  const secili = editMode && hallSelection && hallSelection.type === 'shape' && hallSelection.id === sh.id;
  const tip = sekilTipi(sh.kind);
  // Etiketi olmayan tipler (duvar) yalnızca biçim olarak çizilir.
  const icerik = sh.label
    ? `<span class="hall-shape-label">${esc(sh.label)}</span>`
    : '';
  return `
    <div class="hall-shape ${sh.kind} ${editMode ? 'draggable' : ''} ${secili ? 'selected' : ''}" data-shape-id="${sh.id}" style="${stil}" title="${esc(sh.label || tip.ad)}">
      ${icerik}
    </div>`;
}

/* Salon krokisine bir öğe ekler (sahne, giriş, ikram alanı vb.).
   Bu öğeler görüşme eşleştirmesini hiçbir şekilde etkilemez. */
export function addShape(kind) {
  const tip = sekilTipi(kind);
  const ekle = (etiket) => {
    const sayi = state.shapes.length;
    state.shapes.push({
      id: makeId('sh'), kind, label: etiket,
      x: 6 + (sayi % 4) * 22, y: 74 + Math.floor(sayi / 4) * 16,
      w: tip.w, h: tip.h
    });
    saveState(); render();
  };
  // Etiketsiz tipler (duvar) doğrudan eklenir, metin sorulmaz.
  if (!tip.etiket) { ekle(''); return; }
  openModal({
    title: `${tip.ad} Ekle`,
    message: 'Üzerinde görünecek kısa metni girin:',
    showInput: true, inputValue: tip.etiket, confirmText: 'EKLE',
    onConfirm: (deger) => ekle(normalizeName(deger) || tip.etiket)
  });
}

/* Düzenleme araç çubuğundaki şekil ekleme menüsü. */
export function sekilMenusuHtml() {
  const gruplar = SEKIL_GRUPLARI.map(g => `
    <optgroup label="${g.baslik}">
      ${g.tipler.map(k => `<option value="${k}">${SEKIL_TIPLERI[k].ikon}  ${esc(SEKIL_TIPLERI[k].ad)}</option>`).join('')}
    </optgroup>`).join('');
  return `
    <select class="sekil-menu" aria-label="Krokiye şekil ekle"
            onchange="if(this.value){addShape(this.value);this.selectedIndex=0}">
      <option value="">+ Şekil ekle…</option>
      ${gruplar}
    </select>`;
}

export function removeShape(id) {
  state.shapes = state.shapes.filter(s => s.id !== id);
  saveState(); render();
}

/* follow=true → takip ekranındaki salt okunur kroki. */
export function renderHallCanvas(follow) {
  return `
    <div class="hall-canvas${follow ? ' hall-follow' : ''}" id="hallCanvas">
      ${state.shapes.map(shapeHtml).join('')}
      ${state.tables.map(t => hallCardHtml(t, follow)).join('')}
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

/* Seçili masanın başlığını ya da şeklin etiketini değiştirir.
   Masa adı düzenleme yalnızca burada yapılır (Ayarlar panelindeki
   masa listesi kaldırıldı). */
export function renameSelectedHallItem() {
  if (!hallSelection) return;
  const masaMi = hallSelection.type === 'table';
  const oge = masaMi
    ? state.tables.find(x => x.id === hallSelection.id)
    : state.shapes.find(x => x.id === hallSelection.id);
  if (!oge) return;
  const mevcut = masaMi ? oge.title : oge.label;
  openModal({
    title: masaMi ? 'Masa Adını Değiştir' : 'Şekil Etiketini Değiştir',
    message: 'Yeni adı girin:',
    showInput: true, inputValue: mevcut, confirmText: 'KAYDET',
    onConfirm: (deger) => {
      const yeni = normalizeName(deger);
      if (!yeni) return;
      if (masaMi) {
        oge.title = yeni;
        // Programdaki masa başlığı kopyaları da güncellenmeli ki
        // takvim ve anonslar yeni adı kullansın.
        state.schedule.forEach(s => { if (s.tableId === oge.id) s.tableTitle = yeni; });
      } else {
        oge.label = yeni;
      }
      saveState(); render();
    }
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
