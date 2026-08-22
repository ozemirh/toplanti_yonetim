/* ============================================================
   KAYDET / PAYLAŞ
   Uygulamayı, o anki verileri içine gömerek tek HTML dosyası yapar
   ve alternatif olarak JSON/CSV dışa aktarma sunar.
   ============================================================ */
import { state, setState, saveState, normalizeState } from '../store.js';
import { fmtClock, indirDosya } from '../utils.js';
import { openModal, closeModal } from './modal.js';
import { render } from './router.js';

function buildStandalone() {
  const k = document.documentElement.cloneNode(true);
  k.querySelector('#app').innerHTML = '';
  k.querySelector('#modalRoot').innerHTML = '';
  k.querySelectorAll('script[data-embedded]').forEach(e => e.remove());
  const damga = String(Date.now());
  const s = k.ownerDocument.createElement('script');
  s.setAttribute('data-embedded', damga);
  const govde = JSON.stringify({ stamp: damga, data: state }).split('</').join('<\\/');
  s.textContent = 'window.__GOMULU__ = ' + govde + ';';
  k.querySelector('head').appendChild(s);
  return '<!DOCTYPE html>\n' + k.outerHTML;
}

export function openShare() {
  openModal({
    title: 'Kaydet / Başka Bilgisayarda Aç', wide: true, alertOnly: true, confirmText: 'KAPAT',
    bodyHtml: `
      <div style="border:1px solid var(--blue);border-radius:10px;padding:12px;background:rgba(52,87,213,.06);display:flex;flex-direction:column;gap:10px">
        <div class="section-label">Sayfayı verilerle indir (önerilen)</div>
        <p class="hint">Uygulamanın tamamını, mevcut talepler ve program içine gömülü hâlde tek bir HTML dosyası olarak indirir. Başka bilgisayarda çift tıklayıp açmanız yeterli — sunucu veya internet gerekmez.</p>
        <div class="row"><button type="button" class="green" id="dlHtml">⬇ SAYFAYI VERİLERLE İNDİR (.html)</button><span id="dlStat" style="font-size:12px;font-weight:600"></span></div>
      </div>
      <details class="collapsible"><summary>Diğer</summary><div class="collapsible-body">
        <div class="row">
          <button type="button" class="secondary" id="dlJson">VERİ DOSYASI İNDİR (.json)</button>
          <button type="button" class="secondary" id="upJson">VERİ DOSYASI YÜKLE</button>
        </div>
        <button type="button" class="secondary" id="dlCsv">PROGRAMI CSV OLARAK İNDİR</button>
      </div></details>`,
    onOpen: () => {
      const st = document.getElementById('dlStat');
      document.getElementById('dlHtml').onclick = () => {
        try { indirDosya(buildStandalone(), `b2b-${new Date().toISOString().slice(0, 10)}.html`, 'text/html;charset=utf-8'); st.textContent = 'İndirildi.'; st.style.color = 'var(--green)'; }
        catch (e) { st.textContent = 'Hata: ' + e.message; st.style.color = 'var(--red)'; }
      };
      document.getElementById('dlJson').onclick = () => indirDosya(JSON.stringify(state, null, 2), 'b2b-veri.json', 'application/json');
      document.getElementById('dlCsv').onclick = () => {
        const satir = [['Saat', 'Masa', 'Firma 1', 'Firma 2', 'Süre (dk)']]
          .concat(state.schedule.map(s => [`${fmtClock(s.start)}-${fmtClock(s.end)}`, s.tableTitle, s.from, s.to, s.duration]));
        indirDosya('﻿' + satir.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n'), 'b2b-program.csv', 'text/csv;charset=utf-8');
      };
      document.getElementById('upJson').onclick = () => {
        const i = document.createElement('input');
        i.type = 'file'; i.accept = '.json,application/json';
        i.onchange = () => {
          const f = i.files?.[0]; if (!f) return;
          const rd = new FileReader();
          rd.onload = () => {
            try {
              const veri = normalizeState(JSON.parse(String(rd.result)));
              closeModal();
              openModal({
                title: 'Veriyi Yükle', message: 'Bu bilgisayardaki mevcut veriler değiştirilecek. Devam edilsin mi?',
                confirmText: 'YÜKLE', danger: true,
                onConfirm: () => { setState(veri); saveState(); render(); }
              });
            } catch (e) { openModal({ title: 'Okunamadı', message: 'Dosya geçerli değil.', alertOnly: true }); }
          };
          rd.readAsText(f);
        };
        i.click();
      };
    }
  });
}

/* İndirilen dosya ilk açıldığında gömülü veriyi yükler. */
export function handleEmbedded() {
  const g = window.__GOMULU__;
  if (!g || !g.data) return;
  const anahtar = 'b2b_emb_' + g.stamp;
  try { if (localStorage.getItem(anahtar)) return; localStorage.setItem(anahtar, '1'); } catch (e) {}
  setState(normalizeState(g.data));
  saveState();
}
