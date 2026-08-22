/* ============================================================
   GOOGLE FORMS / APPS SCRIPT ENTEGRASYONU
   Form betiği üretimi + tek tık web uygulaması kurulumu.
   ============================================================ */
import { state, saveState } from './store.js';
import { esc, indirDosya, kopyalaSessiz } from './utils.js';
import { openModal, closeModal } from './render/modal.js';
import { render } from './render/router.js';

/* Google Apps Script kodu üretir. Kullanıcı bunu script.google.com'a
   yapıştırıp çalıştırdığında form, sorular, firma seçenekleri ve yanıt
   tablosu tek seferde oluşur. Elle soru hazırlamaya gerek kalmaz. */
export function formBetigiUret() {
  const ad = state.eventName || 'B2B Görüşme Talebi';
  const jsFirmalar = JSON.stringify(state.firms, null, 2).replace(/\n/g, '\n  ');
  const sureler = ['15 dakika', '20 dakika', '30 dakika'];
  return `/**
 * ${ad} — görüşme talep formu oluşturucu
 * Bu kodu script.google.com'da yeni bir projeye yapıştırıp
 * "formuOlustur" fonksiyonunu çalıştırın.
 */
function formuOlustur() {
  var firmalar = ${jsFirmalar};

  var form = FormApp.create(${JSON.stringify(ad)});
  form.setDescription(
    'Görüşmek istediğiniz firmaları işaretleyin. ' +
    'Seçtiğiniz her firma için ayrı bir görüşme planlanacaktır.'
  );
  form.setCollectEmail(false);
  form.setAllowResponseEdits(false);

  form.addListItem()
    .setTitle('Talep eden firma')
    .setChoiceValues(firmalar)
    .setRequired(true);

  form.addCheckboxItem()
    .setTitle('Görüşmek istediğiniz firmalar')
    .setChoiceValues(firmalar)
    .setRequired(true);

  form.addMultipleChoiceItem()
    .setTitle('Görüşme süresi')
    .setChoiceValues(${JSON.stringify(sureler)})
    .setRequired(true);

  // Yanıtların toplanacağı e-tabloyu oluştur ve bağla
  var tablo = SpreadsheetApp.create(${JSON.stringify(ad + ' — Yanıtlar')});
  form.setDestination(FormApp.DestinationType.SPREADSHEET, tablo.getId());
  PropertiesService.getScriptProperties().setProperty('SHEET_ID', tablo.getId());

  Logger.log('FORM ADRESİ (QR için): ' + form.getPublishedUrl());
  Logger.log('YANIT TABLOSU: ' + tablo.getUrl());
}`;
}

/* Bir kez yayınlanacak Apps Script web uygulaması. Yayınlandıktan
   sonra uygulamadaki düğme bu adrese firma listesini gönderir ve
   form sunucu tarafında oluşturulur — kod kopyalamaya gerek kalmaz. */
export function webAppBetigiUret() {
  return `/**
 * B2B form oluşturucu — WEB UYGULAMASI
 * Bir kez yayınlayın, sonra uygulamadaki düğmeden tetikleyin.
 *
 * Yayınlama: Dağıt > Yeni dağıtım > Tür: Web uygulaması
 *   Yürüten: Ben  |  Erişim: Yalnızca ben
 * Çıkan /exec adresini uygulamadaki "Form oluşturucu adresi" alanına yapıştırın.
 */
function doPost(e) {
  try {
    var veri = JSON.parse(e.parameter.veri);
    var sonuc = formuKur(veri);
    return cikti(
      '<h2>Form oluşturuldu</h2>' +
      '<p><b>Form adresi (QR için):</b><br><a href="' + sonuc.form + '" target="_blank">' + sonuc.form + '</a></p>' +
      '<p><b>Yanıt tablosu:</b><br><a href="' + sonuc.tablo + '" target="_blank">' + sonuc.tablo + '</a></p>' +
      '<p>Form adresini kopyalayıp uygulamadaki <b>Google Form adresi</b> alanına yapıştırın.</p>'
    );
  } catch (hata) {
    return cikti('<h2>Hata</h2><pre>' + hata + '</pre>');
  }
}

function doGet(e) {
  if (e && e.parameter && e.parameter.action === 'veri') return veriGonder(e);
  return cikti('<h2>Hazır</h2><p>Bu adres çalışıyor. Formu uygulamadaki düğmeden oluşturun.</p>');
}

/* Yanıt tablosunu JSONP olarak döndürür (çapraz kaynak kısıtı için).
   Önce istekte sheetId verilmişse onu, yoksa en son oluşturulan
   formun tablosunu kullanır. */
function veriGonder(e) {
  var cb = e.parameter.callback || 'cb';
  var id = e.parameter.sheetId || PropertiesService.getScriptProperties().getProperty('SHEET_ID');
  var yuk = { headers: [], rows: [] };
  try {
    if (id) {
      var sh = SpreadsheetApp.openById(id).getSheets()[0];
      var deger = sh.getDataRange().getValues();
      if (deger.length) { yuk.headers = deger[0].map(String); yuk.rows = deger.slice(1); }
    }
  } catch (hata) { yuk.error = String(hata); }
  var govde = cb + '(' + JSON.stringify(yuk) + ');';
  return ContentService.createTextOutput(govde).setMimeType(ContentService.MimeType.JAVASCRIPT);
}

function cikti(html) {
  return HtmlService.createHtmlOutput(
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<div style="font-family:system-ui;padding:20px;line-height:1.6">' + html + '</div>'
  ).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function formuKur(veri) {
  var firmalar = veri.firmalar || [];
  var ad = veri.ad || 'B2B Görüşme Talebi';
  var sureler = veri.sureler || ['15 dakika', '20 dakika', '30 dakika'];

  if (!firmalar.length) throw new Error('Firma listesi boş.');

  var form = FormApp.create(ad);
  form.setDescription(
    'Görüşmek istediğiniz firmaları işaretleyin. ' +
    'Seçtiğiniz her firma için ayrı bir görüşme planlanacaktır.'
  );
  form.setCollectEmail(false);
  form.setAllowResponseEdits(false);

  form.addListItem().setTitle('Talep eden firma')
    .setChoiceValues(firmalar).setRequired(true);
  form.addCheckboxItem().setTitle('Görüşmek istediğiniz firmalar')
    .setChoiceValues(firmalar).setRequired(true);
  form.addMultipleChoiceItem().setTitle('Görüşme süresi')
    .setChoiceValues(sureler).setRequired(true);

  var tablo = SpreadsheetApp.create(ad + ' — Yanıtlar');
  form.setDestination(FormApp.DestinationType.SPREADSHEET, tablo.getId());
  PropertiesService.getScriptProperties().setProperty('SHEET_ID', tablo.getId());

  return { form: form.getPublishedUrl(), tablo: tablo.getUrl(), sheetId: tablo.getId() };
}`;
}

/* Bazı önizleme ortamları (örn. sohbet içi dosya önizlemesi) sayfayı
   "sandbox" bir çerçevede açar; bu durumda yeni pencere/sekme açmak
   izin diyaloğu bile çıkmadan tamamen engellenir — kullanıcı hiçbir
   izin veremez. Böyle bir ortamda olup olmadığımızı anlamaya çalışırız. */
export function sandboxIcindeMi() {
  try {
    if (window.top === window.self) return false;      // üst pencereyiz, sorun yok
    const iframeEl = window.frameElement;
    if (iframeEl && iframeEl.hasAttribute('sandbox')) {
      const izinler = iframeEl.getAttribute('sandbox') || '';
      if (!izinler.includes('allow-popups')) return true;
    }
  } catch (e) { return true; }   // çapraz kaynak erişimi engellendiyse muhtemelen sandbox
  return false;
}

function formGonder(adres, hedefPencere) {
  const f = document.createElement('form');
  f.method = 'POST';
  f.action = adres;
  f.target = hedefPencere || '_blank';
  const alan = document.createElement('input');
  alan.type = 'hidden';
  alan.name = 'veri';
  alan.value = JSON.stringify({ ad: state.eventName || 'B2B Görüşme Talebi', firmalar: state.firms });
  f.appendChild(alan);
  document.body.appendChild(f);
  f.submit();
  document.body.removeChild(f);
}

export function formuOtomatikOlustur() {
  if (!state.firms.length) {
    openModal({ title: 'Firma Listesi Boş', message: 'Önce katılımcı firmaları ekleyin.', alertOnly: true });
    return;
  }
  const adres = String(state.webAppUrl || '').trim();
  if (!/^https:\/\/script\.google\.com\/.+\/exec/.test(adres)) {
    openModal({
      title: 'Form Oluşturucu Kurulu Değil',
      message: 'Tek tıkla form oluşturmak için önce Apps Script web uygulamasını bir kez yayınlamanız gerekiyor. Kurulum adımlarını göstereyim mi?',
      confirmText: 'KURULUMU GÖSTER',
      onConfirm: () => webAppKurulum()
    });
    return;
  }

  const sandbox = sandboxIcindeMi();

  // Sonuç, açılır pencere yerine uygulamanın içindeki çerçevede gösterilir.
  // Bu hem açılır pencere engelleyicisini hem de bazı önizleme
  // ortamlarının pencere açmayı tamamen kapatmasını devre dışı bırakır.
  openModal({
    title: 'Form Oluşturuluyor', wide: true, alertOnly: true, confirmText: 'KAPAT',
    bodyHtml: `
      ${sandbox ? `<div class="audio-bar" style="font-size:12px">⚠ Bu sayfa şu an kısıtlı bir önizleme içinde açık görünüyor. Sonuç aşağıda görünmezse bu dosyayı indirip normal bir tarayıcı sekmesinde açın, orada sorunsuz çalışır.</div>` : ''}
      <iframe name="b2bCerceve" id="b2bCerceve" class="sonuc-cerceve" title="Form oluşturma sonucu"></iframe>
      <p class="hint" id="cerceveNot">İşlem sürüyor… İlk çalıştırmada Google izin isteyebilir.</p>
      <details class="collapsible"><summary>Sonuç görünmüyorsa</summary><div class="collapsible-body">
        <p class="hint">Bu dosyayı bilgisayarınıza indirip (tarayıcının adres çubuğunda <b>file://</b> ile) açın ya da bir web adresinde yayınlayıp oradan kullanın. "Betiği elle çalıştır" seçeneğiyle de aynı sonucu script.google.com üzerinden doğrudan alabilirsiniz.</p>
      </div></details>`,
    onOpen: () => {
      formGonder(adres, 'b2bCerceve');
      const cerceve = document.getElementById('b2bCerceve');
      const not = document.getElementById('cerceveNot');
      cerceve?.addEventListener('load', () => {
        if (not) not.textContent = 'Form adresini kopyalayıp Ayarlar bölümündeki "Google Form adresi" alanına yapıştırın.';
      });
    }
  });
}

export function webAppKurulum() {
  const kod = webAppBetigiUret();
  openModal({
    title: 'Tek Tıkla Form Oluşturma — Kurulum', wide: true, alertOnly: true, confirmText: 'KAPAT',
    bodyHtml: `
      <p class="hint">Bu kurulumu <b>bir kez</b> yapmanız yeterli. Sonrasında her etkinlikte tek düğmeyle form oluşturursunuz.</p>
      ${state.webAppUrl ? `<div class="audio-bar" style="font-size:12px">⚠ Daha önce kurduysanız: betik güncellendi. Aşağıdaki kodu tekrar yapıştırıp <b>Dağıt → Dağıtımları yönet → kalem simgesi → Sürüm: Yeni sürüm → Dağıt</b> yapın.</div>` : ''}
      <ol class="hint" style="padding-left:18px;line-height:1.9">
        <li><b>script.google.com</b> → <b>Yeni proje</b></li>
        <li>Editördeki her şeyi silin, aşağıdaki kodu yapıştırın, kaydedin</li>
        <li>Sağ üstte <b>Dağıt</b> → <b>Yeni dağıtım</b></li>
        <li>Dişli simgesi → <b>Web uygulaması</b>; Yürüten: <b>Ben</b>, Erişim: <b>Yalnızca ben</b></li>
        <li><b>Dağıt</b> → izinleri onaylayın → çıkan <b>/exec</b> ile biten adresi kopyalayın</li>
        <li>Aşağıdaki alana yapıştırıp kaydedin</li>
      </ol>
      <textarea id="webBox" readonly rows="10" style="font-size:11px">${esc(kod)}</textarea>
      <div class="row">
        <button type="button" class="green" id="copyWeb">KODU KOPYALA</button>
        <span id="webStat" style="font-size:12px;font-weight:600"></span>
      </div>
      <div><label for="webUrlIn">Form oluşturucu adresi (/exec ile biter)</label>
        <input id="webUrlIn" type="url" value="${esc(state.webAppUrl)}" placeholder="https://script.google.com/macros/s/.../exec"></div>
      <button type="button" class="secondary" id="saveWeb">ADRESİ KAYDET</button>`,
    onOpen: () => {
      const kutu = document.getElementById('webBox');
      const st = document.getElementById('webStat');
      kutu?.addEventListener('focus', () => kutu.select());
      document.getElementById('copyWeb').onclick = () => kopyalaSessiz(kod, ok => {
        st.textContent = ok ? 'Kopyalandı.' : 'Kutuya tıklayıp Ctrl+A, Ctrl+C yapın.';
        st.style.color = ok ? 'var(--green)' : 'var(--red)';
        if (!ok) { kutu.focus(); kutu.select(); }
      });
      document.getElementById('saveWeb').onclick = () => {
        const v = String(document.getElementById('webUrlIn').value || '').trim();
        if (v && !/\/exec$/.test(v)) {
          openModal({ title: 'Adres Hatalı', message: 'Adres /exec ile bitmeli. Dağıtım ekranındaki "Web uygulaması URL" değerini kopyalayın.', alertOnly: true });
          return;
        }
        state.webAppUrl = v; saveState(); closeModal(); render();
      };
    }
  });
}

export function formBetigiGoster() {
  if (!state.firms.length) {
    openModal({ title: 'Firma Listesi Boş', message: 'Önce katılımcı firmaları ekleyin; betik listeyi içine gömecek.', alertOnly: true });
    return;
  }
  const kod = formBetigiUret();
  openModal({
    title: 'Formu Otomatik Oluştur', wide: true, alertOnly: true, confirmText: 'KAPAT',
    bodyHtml: `
      <p class="hint">Aşağıdaki kod, ${state.firms.length} firmanızı içeren formu ve yanıt tablosunu tek seferde oluşturur. Elle soru hazırlamanıza gerek yok.</p>
      <ol class="hint" style="padding-left:18px;line-height:1.8">
        <li><b>script.google.com</b> → <b>Yeni proje</b></li>
        <li>Editördeki her şeyi silin, aşağıdaki kodu yapıştırın</li>
        <li>Üstteki <b>▶ Çalıştır</b> düğmesine basın (ilk seferde izin isteyecek, onaylayın)</li>
        <li>Alttaki <b>Yürütme günlüğü</b>nde form adresi ve tablo bağlantısı görünecek</li>
      </ol>
      <textarea id="scriptBox" readonly rows="12" style="font-size:11px">${esc(kod)}</textarea>
      <div class="row">
        <button type="button" class="green" id="copyScript">KODU KOPYALA</button>
        <button type="button" class="secondary" id="dlScript">DOSYA OLARAK İNDİR</button>
        <span id="scriptStat" style="font-size:12px;font-weight:600"></span>
      </div>
      <p class="hint">Firma listesi değişirse betiği yeniden üretip çalıştırın — yeni bir form oluşturur.</p>`,
    onOpen: () => {
      const kutu = document.getElementById('scriptBox');
      const st = document.getElementById('scriptStat');
      kutu?.addEventListener('focus', () => kutu.select());
      document.getElementById('copyScript').onclick = () => {
        kopyalaSessiz(kod, ok => {
          st.textContent = ok ? 'Kopyalandı.' : 'Kopyalanamadı — kutuya tıklayıp Ctrl+A, Ctrl+C yapın.';
          st.style.color = ok ? 'var(--green)' : 'var(--red)';
          if (!ok) { kutu.focus(); kutu.select(); }
        });
      };
      document.getElementById('dlScript').onclick = () => {
        indirDosya(kod, 'form-olustur.gs', 'text/plain;charset=utf-8');
        st.textContent = 'İndirildi.'; st.style.color = 'var(--green)';
      };
    }
  });
}

export function sheetIdCoz(deger) {
  const ham = String(deger || '').trim();
  const m = ham.match(/\/d\/([a-zA-Z0-9-_]+)/);
  return m ? m[1] : ham;   // zaten sade bir kimlikse olduğu gibi kullanılır
}

export function applySheetId() {
  const v = document.getElementById('setSheetId')?.value;
  state.sheetId = sheetIdCoz(v);
  saveState();
}
