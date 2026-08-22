/* ============================================================
   KULLANIM KILAVUZU
   Uygulamanın nasıl kullanılacağını adım adım anlatan modal.
   İçerik arayüzdeki gerçek düğme adlarıyla birebir eşleşmelidir;
   arayüz değişirse burası da güncellenmelidir.
   ============================================================ */
import { openModal } from './modal.js';

const ADIMLAR = [
  {
    no: '1',
    baslik: 'Etkinlik bilgilerini girin',
    yer: 'Ayarlar',
    icerik: `
      <p>Sağ alttaki <b>Ayarlar</b> panelinden etkinlik adını, görüşmelerin
      yapılacağı <b>başlangıç</b> ve <b>bitiş saatini</b> girip
      <b>AYARLARI KAYDET</b>'e basın.</p>
      <p class="guide-note">Saat aralığı, programın kaç görüşme
      sığdırabileceğini doğrudan belirler — dar tutarsanız bazı talepler
      yerleştirilemez.</p>`
  },
  {
    no: '2',
    baslik: 'Katılımcı firmaları ekleyin',
    yer: 'Katılımcı Firmalar',
    icerik: `
      <p><b>Firma listesi ekle</b> kutusuna her satıra bir firma adı yazıp
      <b>LİSTEYE EKLE</b>'ye basın.</p>
      <p>Bu liste yalnızca bir kayıt değil: talepler geldiğinde yazım
      farklarını (<i>TUSAŞ / Tusas / TUSAŞ A.Ş.</i>) otomatik eşleştirmek
      için referans olarak kullanılır.</p>`
  },
  {
    no: '3',
    baslik: 'Görüşme talep formunu oluşturun',
    yer: 'Katılımcı Firmalar',
    icerik: `
      <p>İlk kullanımda <b>⚙ TEK TIK KURULUMU</b>'na basın ve ekrandaki
      adımları izleyin — Google Apps Script betiğini bir kez yayınlarsınız.
      Bu kurulum <b>yalnızca bir defa</b> yapılır.</p>
      <p>Kurulumdan sonra <b>⚡ FORM OLUŞTUR</b> düğmesi, firma listenizi
      içeren Google Form'u ve yanıt tablosunu tek tıkla üretir.</p>
      <p>Çıkan form adresini <b>Ayarlar → Google Form adresi</b> alanına
      yapıştırın.</p>`
  },
  {
    no: '4',
    baslik: 'QR kodu hazırlayın ve gösterin',
    yer: 'Ayarlar → QR Görseli',
    icerik: `
      <p>Form adresini bir QR koda çevirin (örn. qr-code-generator.com),
      görselini <b>⬆ QR GÖRSELİ YÜKLE</b> ile ekleyin.</p>
      <p>Üstteki <b>QR KODU</b> düğmesi kodu tam ekran gösterir; katılımcılar
      telefonlarıyla okutup talep formunu doldurur.</p>
      <p class="guide-note">QR görseli uygulamanın içine kaydedilir, internet
      olmadan da görüntülenir.</p>`
  },
  {
    no: '5',
    baslik: 'Talepleri toplayın',
    yer: 'Talepler',
    icerik: `
      <p><b>Otomatik senkronizasyon</b> kutucuğunu işaretleyin. Sistem 20
      saniyede bir yanıt tablosunu kontrol eder, yeni talepleri alır ve
      <b>masalara kendiliğinden dağıtır</b> — çalışan sayaçlara ve mevcut
      programa dokunmadan.</p>
      <p>Tek tük ekleme için <b>Elle talep ekle</b> bölümünü kullanabilirsiniz.</p>
      <p class="guide-note">Listede olmayan bir firma adı geçerse sağda
      <b>⚠ Listede Olmayan Adlar</b> uyarısı çıkar. Bunları mutlaka
      eşleştirin; aksi hâlde aynı firma iki ayrı firma sayılır ve çakışma
      kontrolü hatalı çalışır.</p>`
  },
  {
    no: '6',
    baslik: 'Masaları yerleştirin',
    yer: 'Masalar → 🗺 SALON PLANI',
    icerik: `
      <p><b>🗺 SALON PLANI</b> → <b>✎ DÜZENLE</b> ile düzenleme moduna geçin.
      Burada:</p>
      <ul>
        <li><b>+ MASA EKLE</b> ile masa açarsınız</li>
        <li>Masaları sürükleyerek gerçek salon düzeninize göre dizersiniz</li>
        <li>Bir masaya/şekle tıklayıp <b>✎ ADINI DEĞİŞTİR</b> veya
            <b>🗑 SEÇİLENİ SİL</b> yaparsınız</li>
        <li><b>+ Şekil ekle…</b> menüsünden sahne, giriş, çıkış, duvar,
            kayıt, ikram, bekleme alanı, WC, yön oku gibi kroki
            öğelerini eklersiniz</li>
      </ul>
      <p class="guide-note">Bu kroki aynı zamanda <b>takip ekranında</b>
      gösterilir — yani buradaki yerleşim, firmaların salonda masalarını
      bulmak için bakacağı plandır. Şekiller eşleştirmeyi etkilemez;
      masa ekleme ve adlandırma sadece bu ekrandan yapılır.</p>`
  },
  {
    no: '7',
    baslik: 'Programı oluşturun',
    yer: 'Talepler → PROGRAMI OLUŞTUR',
    icerik: `
      <p><b>⚙ PROGRAMI OLUŞTUR</b>'a basın. Sistem tüm talepleri saat
      aralığına ve masalara dağıtır.</p>
      <p>Dağıtım adil sıralama gözetir: bir firma arka arkaya değil dönüşümlü
      görüşme alır, karşılıklı talepler öne çekilir, aynı firma iki masada
      aynı anda olamaz.</p>
      <p class="guide-note">Yerleştirilemeyen görüşme kalırsa
      <b>⚠ Masalara Yerleştirilemeyen Talepler</b> panelinde sebebiyle
      listelenir. Çözüm genelde bitiş saatini uzatmak veya masa eklemektir.</p>`
  },
  {
    no: '8',
    baslik: 'Etkinlik günü: sayaçlar ve anonslar',
    yer: 'Masalar',
    icerik: `
      <p>Önce üstteki <b>🔊 SESLİ ANONSU AÇ</b> düğmesine basın — tarayıcılar
      sesi ancak bir tıklamadan sonra çalabilir, bu yüzden bu adım şart.</p>
      <ul>
        <li><b>▶ BAŞLAT</b> — görüşme sayacını başlatır</li>
        <li><b>⏸ DURDUR</b> / <b>↺ SÜREYİ SIFIRLA</b> — duraklatma ve sıfırlama</li>
        <li><b>▶▶ SIRADAKİ</b> — bir sonraki görüşmeye geçer ve firmaları
            <b>sesli olarak masaya çağırır</b></li>
      </ul>
      <p>Sistem ayrıca süre dolmadan <b>1 dakika kala</b> ve süre
      <b>dolduğunda</b> kendiliğinden anons yapar.</p>`
  },
  {
    no: '9',
    baslik: 'Takip ekranını yansıtın',
    yer: 'Üst menü → TAKİP EKRANI',
    icerik: `
      <p><b>TAKİP EKRANI</b> salona yansıtılacak görünümü açar. Varsayılan
      olarak <b>salon krokisi</b> gelir: masalar 6. adımda dizdiğiniz
      fiziksel konumlarında, sahne/giriş/ikram gibi öğelerle birlikte
      çizilir. Böylece firmalar hem sıralarını hem de masalarının salonun
      neresinde olduğunu tek bakışta görür.</p>
      <p>Kontrol panelinde yaptığınız her değişiklik (başlatma, sıradakine
      geçme) bu ekrana otomatik yansır.</p>
      <p>Kartların altındaki <b>Sıradaki …</b> satırına tıklanınca o masanın
      tüm görüşme sırası saatleriyle birlikte açılır.</p>
      <p><b>≡ LİSTE</b> düğmesiyle, sayaçların daha büyük göründüğü sade
      ızgara görünümüne geçebilirsiniz.</p>
      <p class="guide-note">Tarayıcı yeni sekmeyi engellerse "bu sekmede aç"
      seçeneği sunulur; kalıcı çözüm için adres çubuğundaki engelleme
      simgesinden bu siteye izin verin.</p>`
  },
  {
    no: '10',
    baslik: 'Yedek alın',
    yer: 'Üst menü → PAYLAŞ / KAYDET',
    icerik: `
      <p>Tüm veriyi dışa aktarıp yedekleyebilir, gerektiğinde geri
      yükleyebilirsiniz.</p>
      <p class="guide-note"><b>Önemli:</b> Veriler bu tarayıcıda saklanır.
      Başka bir bilgisayardan veya tarayıcıdan girdiğinizde görünmez ve
      tarayıcı verileri temizlenirse kaybolur. Etkinlik öncesi mutlaka yedek
      alın.</p>`
  }
];

export function kilavuzGoster() {
  const adimlar = ADIMLAR.map(a => `
    <section class="guide-step">
      <div class="guide-step-head">
        <span class="guide-no">${a.no}</span>
        <div>
          <h4>${a.baslik}</h4>
          <span class="guide-where">${a.yer}</span>
        </div>
      </div>
      <div class="guide-body">${a.icerik}</div>
    </section>`).join('');

  openModal({
    title: 'Kullanım Kılavuzu',
    wide: true, alertOnly: true, confirmText: 'KAPAT',
    bodyHtml: `
      <p class="guide-intro">Etkinlik öncesi hazırlıktan salondaki canlı
      yönetime kadar sırayla izlemeniz gereken adımlar.</p>
      <div class="guide">${adimlar}</div>`
  });
}
