/* ============================================================
   KONTROL PANELİ (ana yönetim ekranı)

   Yerleşim işlem önceliğine göre kurulur ve etkinliğin hangi
   aşamada olduğuna göre değişir:

     HAZIRLIK (program henüz oluşturulmadı)
       → Talepler ve firma/form kurulumu öne çıkar; masa kartları
         boş olduğu için geniş alanı kaplamaz.
     CANLI (program hazır)
       → Masa sayaçları ve görüşme programı asıl alanı alır;
         hazırlık panelleri yan sütuna çekilir.

   Eylem gerektiren uyarılar her iki aşamada da en üstte,
   tam genişlikte gösterilir.
   ============================================================ */
import { state } from '../store.js';
import { esc, upper } from '../utils.js';
import { taninmayanAdlar } from '../firmMatching.js';
import { sesAcik, startTicking } from '../timers.js';
import { tableCardHtml } from './tableCard.js';
import { scheduleTableHtml, requestListHtml } from './scheduleTable.js';
import { renderHallCanvas, bindHallDragging, layoutView, editMode, getHallSelection, sekilMenusuHtml } from './hall.js';

/* ---------- Paneller ---------- */

function masalarPanel() {
  const hallSelection = getHallSelection();
  return `
    <section class="panel">
      <div class="panel-header">
        <h2>Masalar</h2>
        <div class="row" style="gap:6px">
          ${layoutView ? `
            <button type="button" class="secondary small" onclick="resetLayout()">↺ SIFIRLA</button>
            <button type="button" class="${editMode ? 'green' : 'secondary'} small" onclick="toggleEditMode()">${editMode ? '✔ BİTTİ' : '✎ DÜZENLE'}</button>
          ` : ''}
          <button type="button" class="secondary small" onclick="toggleLayoutView()">${layoutView ? '≡ LİSTE' : '🗺 SALON PLANI'}</button>
          <span class="hint" style="font-size:11px">${state.startTime} – ${state.endTime}</span>
        </div>
      </div>
      ${layoutView && editMode ? `
        <div class="row" style="padding:8px 12px;border-bottom:1px solid var(--border-soft);background:var(--card-alt)">
          <button type="button" class="secondary small" onclick="addTable()">+ MASA EKLE</button>
          ${sekilMenusuHtml()}
          <span style="flex:1"></span>
          <button type="button" class="secondary small" onclick="renameSelectedHallItem()" ${hallSelection ? '' : 'disabled'}>✎ ADINI DEĞİŞTİR</button>
          <button type="button" class="red small" onclick="deleteSelectedHallItem()" ${hallSelection ? '' : 'disabled'}>🗑 SEÇİLENİ SİL</button>
        </div>
        <div class="hint" style="padding:0 12px 8px;font-size:11px">
          ${hallSelection ? `Seçili: ${hallSelection.type === 'table' ? (state.tables.find(x => x.id === hallSelection.id)?.title || '') : (state.shapes.find(x => x.id === hallSelection.id)?.label || '')}` : 'Adını değiştirmek veya silmek için bir masaya ya da şekle tıklayın.'}
        </div>
      ` : ''}
      <div class="panel-body">
        ${layoutView ? renderHallCanvas() : `<div class="tables-grid">${state.tables.map(t => tableCardHtml(t, false)).join('')}</div>`}
      </div>
    </section>`;
}

function programPanel() {
  return `
    <section class="panel">
      <div class="panel-header"><h2>Görüşme Programı</h2><span>${state.schedule.length} görüşme</span></div>
      <div class="panel-body">${scheduleTableHtml()}</div>
    </section>`;
}

function taleplerPanel(birincil) {
  return `
    <section class="panel${birincil ? ' panel-primary' : ''}">
      <div class="panel-header"><h2>Talepler</h2><span>${state.requests.length}</span></div>
      <div class="panel-body">
        ${state.webAppUrl ? `
          <div class="sync-box ${state.autoSync ? 'on' : ''}">
            <label class="sync-toggle">
              <input type="checkbox" ${state.autoSync ? 'checked' : ''} onchange="toggleAutoSync(this.checked)">
              <span>Otomatik senkronizasyon — talep girildiğinde otomatik alınsın</span>
            </label>
            ${state.autoSync ? `
              <p class="hint" id="syncStatus">Bekleniyor…</p>
              <details class="collapsible"><summary>Yanıt tablosu belirt (isteğe bağlı)</summary><div class="collapsible-body">
                <p class="hint">Boş bırakılırsa en son oluşturulan form kullanılır. Birden fazla form oluşturduysanız hangisinin yanıtları izlensin, tablonun adresini buraya yapıştırın.</p>
                <input id="setSheetId" type="text" value="${esc(state.sheetId)}" placeholder="Yanıt tablosu adresi veya kimliği" onchange="applySheetId()">
              </div></details>
            ` : ''}
          </div>
        ` : `<p class="hint">Otomatik senkronizasyon için önce "⚙ Tek tık kurulumu"nu tamamlayın.</p>`}

        <details class="collapsible">
          <summary>Elle talep ekle</summary>
          <div class="collapsible-body">
            <div class="grid2">
              <div><label for="mFrom">Talep eden</label><input id="mFrom" type="text" autocomplete="off"></div>
              <div><label for="mTo">Görüşülecek</label><input id="mTo" type="text" autocomplete="off"></div>
            </div>
            <div class="grid2">
              <div><label for="mDur">Süre (dk)</label><input id="mDur" type="number" min="1" value="${state.defaultDuration}"></div>
              <div style="display:flex;align-items:flex-end"><button type="button" class="secondary" style="width:100%" onclick="addManualRequest()">EKLE</button></div>
            </div>
          </div>
        </details>

        ${requestListHtml()}
        <div class="row">
          <button type="button" class="green" style="flex:1" onclick="generateSchedule()">⚙ PROGRAMI OLUŞTUR</button>
          <button type="button" class="ghost" onclick="clearRequests()">TEMİZLE</button>
        </div>
      </div>
    </section>`;
}

function firmalarPanel() {
  return `
    <section class="panel">
      <div class="panel-header"><h2>Katılımcı Firmalar</h2><span>${state.firms.length}</span></div>
      <div class="panel-body">
        ${state.firms.length ? '' : `<p class="hint">Etkinliğe katılacak firmaları buraya ekleyin. Sonra bu listeyi kopyalayıp Google Form'daki açılır listelere yapıştırın — böylece katılımcılar yazmak yerine seçer ve yazım hatası olmaz.</p>`}
        <details class="collapsible" ${state.firms.length ? '' : 'open'}>
          <summary>Firma listesi ekle</summary>
          <div class="collapsible-body">
            <textarea id="firmBox" placeholder="Her satıra bir firma:&#10;ONS MAKİNA&#10;TUSAŞ&#10;BAYKAR"></textarea>
            <div class="row"><button type="button" onclick="firmaEkleToplu()">LİSTEYE EKLE</button></div>
          </div>
        </details>
        ${state.firms.length ? `
          <div class="firm-list">${state.firms.map(f => `<span class="firm-chip">${esc(f)}<button type="button" onclick="firmaSil('${esc(f).replace(/'/g, "\\'")}')">×</button></span>`).join('')}</div>
          <div class="row">
            <button type="button" class="green" style="flex:1" onclick="formuOtomatikOlustur()">⚡ FORM OLUŞTUR</button>
            <button type="button" class="secondary small" onclick="firmaListesiniKopyala()">Listeyi kopyala</button>
            <button type="button" class="ghost small" onclick="firmaListesiniTemizle()">Temizle</button>
          </div>` : ''}

        <div class="row" style="border-top:1px solid var(--border-soft);padding-top:10px;margin-top:2px">
          <button type="button" class="${state.webAppUrl ? 'secondary' : 'yellow'} small" onclick="webAppKurulum()">
            ${state.webAppUrl ? '⚙ Form oluşturucu ayarı' : '⚙ TEK TIK KURULUMU'}
          </button>
          ${state.webAppUrl ? '<span class="hint" style="font-size:11px;color:var(--green);font-weight:600">✓ kurulu</span>' : ''}
        </div>
      </div>
    </section>`;
}

function ayarlarPanel() {
  return `
    <section class="panel">
      <div class="panel-header"><h2>Ayarlar</h2></div>
      <div class="panel-body">
        <div><label for="setName">Etkinlik adı</label><input id="setName" type="text" value="${esc(state.eventName)}" autocomplete="off"></div>
        <div class="grid2">
          <div><label for="setStart">Başlangıç</label><input id="setStart" type="time" value="${esc(state.startTime)}"></div>
          <div><label for="setEnd">Bitiş</label><input id="setEnd" type="time" value="${esc(state.endTime)}"></div>
        </div>
        <div><label for="setForm">Google Form adresi</label><input id="setForm" type="url" value="${esc(state.formUrl)}" placeholder="https://forms.gle/..."></div>
        <div><label for="setWebApp">Form oluşturucu adresi (tek tık)</label><input id="setWebApp" type="url" value="${esc(state.webAppUrl)}" placeholder="https://script.google.com/macros/s/.../exec"></div>
        <button type="button" class="secondary" onclick="applySettings()">AYARLARI KAYDET</button>

        <div class="section-label">QR Görseli</div>
        ${state.qrImage
          ? `<div class="qr-preview"><img src="${state.qrImage}" alt="Yüklenen QR"><div class="row">
               <button type="button" class="secondary small" onclick="qrGorseliYukle()">DEĞİŞTİR</button>
               <button type="button" class="red small" onclick="qrGorseliSil()">KALDIR</button>
             </div></div>`
          : `<p class="hint">QR kodunuzu bir kez üretip (örn. qr-code-generator.com) görselini buraya yükleyin. Böylece internet olmadan da görüntülenir.</p>
             <button type="button" class="secondary" onclick="qrGorseliYukle()">⬆ QR GÖRSELİ YÜKLE</button>`}
      </div>
    </section>`;
}

/* ---------- Uyarılar (eylem gerektirir — her zaman en üstte) ---------- */

function bilinmeyenAdlarPanel(bilinmeyen) {
  return `
    <section class="panel panel-uyari">
      <div class="panel-header"><h2>⚠ Listede Olmayan Adlar</h2><span>${bilinmeyen.length}</span></div>
      <div class="panel-body">
        <p class="hint">Bu adlar katılımcı firma listesinde yok. Aynı firmanın farklı yazımı olabilir — eşleştirin ya da listeye ekleyin. Aksi halde ayrı firma sayılır ve çakışma kontrolü hatalı olur.</p>
        <div class="uyari-grid">
          ${bilinmeyen.map(b => `
            <div class="unknown-row">
              <div><b>${esc(b.ad)}</b> <span class="hint" style="font-size:11px">(${b.sayi} talep)</span></div>
              <div class="row">
                ${b.oneri ? `<button type="button" class="green small" onclick="adiEsle('${esc(b.ad).replace(/'/g, "\\'")}','${esc(b.oneri.firma).replace(/'/g, "\\'")}')">→ ${esc(b.oneri.firma)}</button>` : ''}
                <select onchange="if(this.value)adiEsle('${esc(b.ad).replace(/'/g, "\\'")}',this.value)">
                  <option value="">Başka firmaya eşle…</option>
                  ${state.firms.map(f => `<option value="${esc(f)}">${esc(f)}</option>`).join('')}
                </select>
                <button type="button" class="secondary small" onclick="adiFirmaYap('${esc(b.ad).replace(/'/g, "\\'")}')">YENİ FİRMA</button>
              </div>
            </div>`).join('')}
        </div>
      </div>
    </section>`;
}

function yerlesemeyenlerPanel() {
  return `
    <section class="panel panel-uyari">
      <div class="panel-header"><h2>⚠ Masalara Yerleştirilemeyen Talepler</h2><span>${state.unscheduled.length}</span></div>
      <div class="panel-body">
        <p class="hint">Bu görüşmeler için etkinlik saatleri içinde iki firmanın ve bir masanın birlikte boş olduğu bir zaman bulunamadı. Etkinlik bitiş saatini uzatmak, masa eklemek ya da bu firmaların diğer görüşme sürelerini kısaltmak çözebilir.</p>
        <div class="sched" style="max-height:260px"><table>
          <thead><tr><th>Firmalar</th><th>Süre</th><th>Sebep</th></tr></thead>
          <tbody>${state.unscheduled.map(u => `<tr>
            <td class="pair">${esc(u.from)} ↔ ${esc(u.to)}</td>
            <td>${u.duration} dk</td>
            <td>${esc(u.reason || '')}</td>
          </tr>`).join('')}</tbody>
        </table></div>
      </div>
    </section>`;
}

/* ---------- Ekran ---------- */

export function renderControl() {
  document.body.style.overflow = '';
  const firmalar = new Set();
  state.requests.forEach(r => { firmalar.add(upper(r.from)); firmalar.add(upper(r.to)); });
  const bilinmeyen = state.firms.length ? taninmayanAdlar() : [];

  // Aşama: program oluşturulduysa etkinlik canlı yönetim aşamasındadır.
  const canli = state.schedule.length > 0;

  const uyarilar = [
    bilinmeyen.length ? bilinmeyenAdlarPanel(bilinmeyen) : '',
    state.unscheduled.length ? yerlesemeyenlerPanel() : ''
  ].filter(Boolean).join('');

  // Öncelik sırası aşamaya göre değişir.
  const [birincil, ikincil] = canli
    ? [[masalarPanel(), programPanel()],
       [taleplerPanel(false), firmalarPanel(), ayarlarPanel()]]
    : [[taleplerPanel(true), masalarPanel()],
       [firmalarPanel(), ayarlarPanel()]];

  document.getElementById('app').innerHTML = `
    <main class="shell">
      <section class="topbar">
        <div class="topbar-title">
          <h1>${esc(state.eventName || 'B2B Görüşme Eşleştirme Sistemi')}</h1>
          <span class="phase-pill ${canli ? 'canli' : ''}">${canli ? '● CANLI' : '○ HAZIRLIK'}</span>
        </div>
        <div class="top-actions">
          ${sesAcik ? '' : `<button type="button" class="yellow" onclick="sesiAc()">🔊 SESLİ ANONSU AÇ</button>`}
          <button type="button" onclick="openFollow()">TAKİP EKRANI</button>
          <button type="button" class="secondary" onclick="openQr()">QR KODU</button>
          <button type="button" class="secondary" onclick="openShare()">PAYLAŞ / KAYDET</button>
          <button type="button" class="ghost" onclick="kilavuzGoster()" title="Adım adım kullanım kılavuzu">? KILAVUZ</button>
        </div>
      </section>

      ${canli && !sesAcik ? `<div class="audio-bar">⚠ Sesli anonslar kapalı. Etkinlik başlamadan önce "SESLİ ANONSU AÇ" düğmesine basın — tarayıcılar sesi ancak bir tıklamadan sonra çalabilir.</div>` : ''}

      ${uyarilar}

      <div class="stat-row">
        <div class="stat"><div class="k">Firma</div><div class="v">${firmalar.size}</div></div>
        <div class="stat"><div class="k">Talep</div><div class="v">${state.requests.length}</div></div>
        <div class="stat"><div class="k">Görüşme</div><div class="v">${state.schedule.length}</div></div>
        <div class="stat"><div class="k">Masa</div><div class="v">${state.tables.length}</div></div>
      </div>

      <div class="main-layout">
        <div class="col">${birincil.join('')}</div>
        <div class="col">${ikincil.join('')}</div>
      </div>
    </main>`;
  startTicking();
  if (layoutView) bindHallDragging();
}
