# B2B Görüşme Eşleştirme Sistemi

Etkinlik sonrası ikili (B2B) görüşmeleri planlayan, canlı sayaç ve sesli
anonslarla yürüten, Google Forms/Apps Script entegrasyonlu tek
organizatörlük bir yönetim uygulaması. Sunucu / veritabanı yoktur —
tüm veriler tarayıcının `localStorage`'ında (`b2b_match_state`
anahtarı) tutulur.

## Özellikler

- Katılımcı firma listesi yönetimi ve serbest metin firma adı
  eşleştirme/normalizasyonu (yazım farklarını tolere eder)
- Google Forms ile talep toplama: tek tıkla form + yanıt tablosu
  oluşturan Apps Script kodu üretimi, JSONP ile otomatik senkronizasyon
- Talepleri masalara/zaman dilimlerine dağıtan planlama motoru
- Masa bazlı canlı sayaç ve Web Speech API ile sesli anonslar
- Sürükle-bırak salon planı editörü
- QR kod ekranı ve tam ekran "takip ekranı" (genel görüntüleme)
- Verilerin tek bir `.html` dosyası olarak indirilip başka bir
  bilgisayarda internetsiz açılabilmesi (JSON/CSV dışa aktarma dahil)

## Proje yapısı

```
toplanti_yonetim/
  index.html            Vite giriş noktası
  package.json
  vite.config.js
  index.legacy.html     Refactor öncesi orijinal tek dosyalı sürüm (yedek/referans)
  src/
    main.js             Uygulama başlangıcı, satır-içi onclick tutamaçlarının window'a bağlanması
    style.css           Tüm stiller
    utils.js            Saf yardımcı fonksiyonlar (id, tarih/saat biçimleme, esc, vb.)
    store.js            defaultState / normalizeState / loadState / saveState (localStorage)
    firmMatching.js      Firma adı eşleştirme, resmi firma listesi yönetimi
    scheduling.js         Planlama motoru (mergeRequests, isleriYerlestir, buildSchedule, ...)
    timers.js              Sayaç ve sesli anons (Web Speech API)
    googleForms.js          Apps Script kod üretimi, tek tık form oluşturucu kurulumu
    importRequests.js        Talep içe aktarma (yapıştırılan tablo / sheet satırları)
    sync.js                   JSONP tabanlı otomatik senkronizasyon
    tables.js                  Masa/ayar yönetimi
    render/
      router.js               Ekranlar arası geçiş (hash tabanlı), render() dağıtıcısı
      control.js               Kontrol paneli (ana yönetim ekranı)
      follow.js                 Takip ekranı (fullscreen genel görüntüleme)
      qr.js                      QR ekranı
      hall.js                    Salon planı sürükle-bırak editörü
      tableCard.js                Masa kartı HTML üretimi
      scheduleTable.js             Program/talep tablosu HTML üretimi
      modal.js                     Onay/uyarı/girdi penceresi
      share.js                     Kaydet/Paylaş (tek dosya HTML, JSON, CSV)
      polling.js                   Takip ekranının kontrol panelini yoklaması
```

Kod mimarisi bölündü; **iş mantığının hiçbiri değiştirilmedi** —
planlama motoru, firma adı eşleştirme, Google Apps Script kod üretimi,
JSONP senkronizasyon ve sayaç/anons mantığı orijinal davranışıyla
aynen korunmuştur. Türkçe fonksiyon/değişken adları da olduğu gibi
bırakıldı.

Render fonksiyonları HTML'i doğrudan dize olarak üretmeye devam
ediyor (orijinal yaklaşım); bu yüzden `onclick="..."` tutamaçlarının
çağırdığı fonksiyonlar `src/main.js` içinde `window` nesnesine
bağlanıyor.

## Kurulum

```bash
npm install
```

## Geliştirme

```bash
npm run dev
```

Vite geliştirme sunucusunu başlatır (varsayılan olarak
`http://localhost:5173`), dosya değişikliklerinde anında yeniler.

## Build (statik dağıtım)

```bash
npm run build
```

`dist/` klasörüne statik dosyalar üretir. Çıktı tamamen statiktir;
herhangi bir statik dosya sunucusuna (Netlify, Vercel, GitHub Pages,
paylaşımlı hosting, vb.) veya doğrudan bir dosya sunucusu olmadan da
kullanılabilir (uygulamanın "Paylaş / Kaydet" ekranındaki tek-dosya
HTML indirme özelliği internetsiz kullanım için ayrıca mevcuttur).

Yerel olarak önizlemek için:

```bash
npm run preview
```

## Veri ve taşınabilirlik

- Tüm durum `localStorage['b2b_match_state']` içinde saklanır;
  tarayıcı/bilgisayar değişse bile bu anahtar aynı kalır, böylece
  mevcut kurulumlardan geçişte veri kaybı yaşanmaz.
- Kontrol panelindeki **Paylaş / Kaydet** ekranından uygulamanın o anki
  verilerle gömülü tek bir `.html` dosyası indirilebilir; bu dosya
  sunucu/internet gerekmeden başka bir bilgisayarda çalışır.
- JSON dışa/içe aktarma ve program CSV dışa aktarma da aynı ekrandan
  yapılır.

## Google Forms / Apps Script entegrasyonu

Uygulama içindeki **"⚙ Tek Tık Kurulumu"** akışı, bir kez yayınlanacak
bir Apps Script web uygulaması betiği üretir; bu kurulumdan sonra
firma listesi tek düğmeyle form ve yanıt tablosuna dönüştürülür.
İsteyenler için **"Betiği elle çalıştır"** seçeneği de ayrıca betiği
`script.google.com` üzerinde elle çalıştırma imkânı sunar. Detaylar
uygulama içindeki ilgili modallerde adım adım anlatılmaktadır.

## Bilinen sınırlamalar

- Bu bir istemci-taraflı (backend'siz) uygulamadır; birden fazla
  organizatörün eşzamanlı düzenleme yapması desteklenmez (veriler
  tarayıcı başına yereldir).
- Sesli anons Web Speech API'ye bağlıdır; bu API'yi desteklemeyen
  tarayıcılarda (bazı mobil tarayıcılar) sessiz kalır.
- Google Forms senkronizasyonu, Apps Script web uygulamasının
  "Yalnızca ben" erişimle yayınlanmış olmasını ve tarayıcının üçüncü
  taraf `<script>` enjeksiyonuna (JSONP) izin vermesini gerektirir.
