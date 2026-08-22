/* ============================================================
   QR EKRANI
   Yüklenmiş sabit görsel varsa o gösterilir (internet gerektirmez).
   Yoksa form adresinden çevrimiçi üretilmeye çalışılır.
   ============================================================ */
import { state, saveState } from '../store.js';
import { esc } from '../utils.js';
import { openModal } from './modal.js';
import { render } from './router.js';

export function renderQr() {
  document.body.style.overflow = '';
  const gorsel = state.qrImage;
  const url = state.formUrl;
  const cevrimici = !gorsel && url
    ? `https://api.qrserver.com/v1/create-qr-code/?size=600x600&margin=12&data=${encodeURIComponent(url)}`
    : '';

  let icerik;
  if (gorsel) {
    icerik = `<div class="qr-box"><img src="${gorsel}" alt="Görüşme talep formu QR kodu"></div>`;
  } else if (cevrimici) {
    icerik = `<div class="qr-box" id="qrBox"><img src="${esc(cevrimici)}" alt="Form QR kodu" onerror="qrHata()"></div>`;
  } else {
    icerik = `<p class="hint" style="font-size:15px;max-width:520px">Henüz QR görseli yüklenmedi.<br>Kontrol panelindeki <b>Ayarlar → QR Görseli</b> bölümünden yükleyebilirsiniz.</p>`;
  }

  document.getElementById('app').innerHTML = `
    <main class="shell">
      <section class="topbar">
        <h1>${esc(state.eventName || 'Görüşme Talep Formu')}</h1>
        <button type="button" class="secondary" onclick="closeQr()">← KONTROL PANELİ</button>
      </section>
      <section class="panel"><div class="qr-wrap">
        ${(gorsel || cevrimici) ? `<p class="hint" style="font-size:18px;max-width:600px">Görüşmek istediğiniz firmaları bildirmek için telefonunuzun kamerasıyla okutun.</p>` : ''}
        ${icerik}
        ${url ? `<div class="qr-link" id="qrLink">${esc(url)}</div>
                 <button type="button" class="secondary" onclick="kopyala('${esc(url)}')">ADRESİ KOPYALA</button>` : ''}
      </div></section>
    </main>`;
}

export function qrHata() {
  const k = document.getElementById('qrBox');
  if (k) k.innerHTML = '<p class="hint" style="padding:20px;max-width:420px">QR görüntüsü çevrimiçi üretilemedi (internet yok).<br>Ayarlar bölümünden sabit bir QR görseli yükleyin.</p>';
  const l = document.getElementById('qrLink');
  if (l) { l.style.fontSize = '17px'; l.style.fontWeight = '700'; l.style.color = 'var(--blue)'; }
}

/* QR görselini dosyadan yükler ve veri olarak saklar; böylece
   kaydedilen HTML dosyasının içine de gömülür. */
export function qrGorseliYukle() {
  const inp = document.createElement('input');
  inp.type = 'file';
  inp.accept = 'image/png,image/jpeg,image/svg+xml,image/webp';
  inp.onchange = () => {
    const f = inp.files?.[0];
    if (!f) return;
    if (f.size > 3 * 1024 * 1024) {
      openModal({ title: 'Dosya Çok Büyük', message: 'QR görseli 3 MB\'tan küçük olmalı. Daha küçük bir görsel kullanın.', alertOnly: true });
      return;
    }
    const rd = new FileReader();
    rd.onload = () => {
      state.qrImage = String(rd.result);
      saveState(); render();
    };
    rd.onerror = () => openModal({ title: 'Okunamadı', message: 'Görsel okunamadı.', alertOnly: true });
    rd.readAsDataURL(f);
  };
  inp.click();
}

export function qrGorseliSil() {
  openModal({
    title: 'QR Görselini Kaldır', message: 'Yüklenen QR görseli silinsin mi?',
    confirmText: 'KALDIR', danger: true,
    onConfirm: () => { state.qrImage = ''; saveState(); render(); }
  });
}
