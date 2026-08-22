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

  const duzenle = editMode && !follow;
  const secili = duzenle && hallSelection && hallSelection.type === 'table' && hallSelection.id === t.id;
  // Masalar döndürülmez (sayaç/firma adı okunaksız olurdu), yalnızca
  // boyutlandırılır.
  const tutamac = secili ? `<span class="hall-handle hall-resize" data-handle="resize" title="Boyutlandır"></span>` : '';
  return `
    <div class="hall-card table-card ${cls} ${duzenle ? 'draggable' : ''} ${secili ? 'selected' : ''}" data-card="${t.id}" data-hall-id="${t.id}" style="${stil}">
      <div class="tc-head">${esc(t.title)}</div>
      ${govde}${alt}${tutamac}
    </div>`;
}

function shapeHtml(sh, follow) {
  // Düzenleme durumu kontrol paneline aittir; takip ekranı aynı
  // sekmede açıldığında oraya sızmamalıdır.
  const duzenle = editMode && !follow;
  const rot = sh.rot || 0;
  const stil = `left:${sh.x}%;top:${sh.y}%;width:${sh.w}%;height:${sh.h}%;`
             + (rot ? `transform:rotate(${rot}deg);` : '');
  const secili = duzenle && hallSelection && hallSelection.type === 'shape' && hallSelection.id === sh.id;
  const tip = sekilTipi(sh.kind);
  // Etiketi/emojisi olmayan tipler (duvar) yalnızca biçim olarak çizilir.
  const icerik =
    (tip.emoji ? `<span class="hall-shape-icon">${tip.emoji}</span>` : '') +
    (sh.label ? `<span class="hall-shape-label">${esc(sh.label)}</span>` : '');
  // Boyutlandırma/döndürme tutamaçları yalnızca seçili öğede görünür.
  const tutamaclar = secili
    ? `<span class="hall-handle hall-rotate" data-handle="rotate" title="Döndür"></span>
       <span class="hall-handle hall-resize" data-handle="resize" title="Boyutlandır"></span>`
    : '';
  return `
    <div class="hall-shape ${sh.kind} ${duzenle ? 'draggable' : ''} ${secili ? 'selected' : ''}" data-shape-id="${sh.id}" style="${stil}" title="${esc(sh.label || tip.ad)}">
      ${icerik}${tutamaclar}
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
      w: tip.w, h: tip.h, rot: 0
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
      ${state.shapes.map(sh => shapeHtml(sh, follow)).join('')}
      ${state.tables.map(t => hallCardHtml(t, follow)).join('')}
    </div>`;
}

/* Fare/dokunma ile sürükleyerek masa/şekil konumunu değiştirir.
   Konumlar %2'lik adımlarla ızgaraya yapışır ve tuval sınırları
   içinde tutulur. Masalar ve şekiller aynı sürükleme mantığını
   paylaşır; hangi diziye ait olduğu veri kümesi ile belirlenir.

   Seçili öğede iki tutamaç belirir:
     • sağ alt  → boyutlandırma (masa ve şekil)
     • üst orta → döndürme (yalnız şekil, 15°'lik adımlarla) */
export function bindHallDragging() {
  const canvas = document.getElementById('hallCanvas');
  if (!canvas || !editMode) return;

  /* Ortak tutamaç sürükleme iskeleti — hareket ve bitiş davranışını
     çağırana bırakır. */
  const tutamacSurukle = (el, ev, hareket) => {
    ev.preventDefault();
    ev.stopPropagation();
    el.setPointerCapture(ev.pointerId);
    el.classList.add('taken');
    const birak = () => {
      el.classList.remove('taken');
      el.removeEventListener('pointermove', hareket);
      el.removeEventListener('pointerup', birak);
      saveState();
      render();   // tutamaç konumları ve ölçüler yeniden çizilsin
    };
    el.addEventListener('pointermove', hareket);
    el.addEventListener('pointerup', birak);
  };

  const boyutlandir = (el, veri, ev) => {
    const canvasRect = canvas.getBoundingClientRect();
    const basX = ev.clientX, basY = ev.clientY;
    const w0 = veri.w, h0 = veri.h;
    const rad = ((veri.rot || 0) * Math.PI) / 180;
    tutamacSurukle(el, ev, (mv) => {
      let dx = mv.clientX - basX, dy = mv.clientY - basY;
      // Öğe döndürülmüşse ekran hareketini öğenin kendi eksenlerine çevir.
      if (rad) {
        const c = Math.cos(-rad), s = Math.sin(-rad);
        [dx, dy] = [dx * c - dy * s, dx * s + dy * c];
      }
      const nw = w0 + (dx / canvasRect.width) * 100;
      const nh = h0 + (dy / canvasRect.height) * 100;
      veri.w = Math.max(3, Math.min(100 - veri.x, Math.round(nw)));
      veri.h = Math.max(3, Math.min(100 - veri.y, Math.round(nh)));
      el.style.width = veri.w + '%';
      el.style.height = veri.h + '%';
    });
  };

  const dondur = (el, veri, ev) => {
    // Döndürülmüş öğenin sınır kutusu eksen hizalıdır ama merkezi
    // değişmez; açı bu merkeze göre hesaplanır.
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const aci = (e) => (Math.atan2(e.clientY - cy, e.clientX - cx) * 180) / Math.PI;
    const bas = aci(ev), rot0 = veri.rot || 0;
    tutamacSurukle(el, ev, (mv) => {
      const ham = rot0 + (aci(mv) - bas);
      const yapisik = Math.round(ham / 15) * 15;        // 15°'lik adımlar
      veri.rot = ((yapisik % 360) + 360) % 360;
      el.style.transform = `rotate(${veri.rot}deg)`;
    });
  };

  const surukleBagla = (el, veri, tur) => {
    el.addEventListener('pointerdown', (ev) => {
      // Tutamaca basıldıysa taşıma değil, boyutlandırma/döndürme.
      const tutamac = ev.target?.dataset?.handle;
      if (tutamac === 'resize') { boyutlandir(el, veri, ev); return; }
      if (tutamac === 'rotate') { dondur(el, veri, ev); return; }

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
