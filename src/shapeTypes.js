/* ============================================================
   SALON PLANI ŞEKİL TİPLERİ

   Salon krokisinde masaların dışında kalan öğeler. Görüşme
   eşleştirmesini hiçbir şekilde etkilemezler; yalnızca firmaların
   salonu okuyabilmesi için görsel referanstır.

   Bu kayıt defteri tek doğruluk kaynağıdır: hem şekil ekleme menüsü
   hem de kayıtlı verinin doğrulaması (store.js) buradan beslenir.
   Yeni bir tip eklemek için buraya bir satır ve style.css'e karşılık
   gelen bir sınıf eklemek yeterlidir.

   Alanlar:
     ad     — menüde görünen isim
     etiket — varsayılan metin ('' ise metin sorulmaz, yalnız çizilir)
     emoji  — krokide öğenin üzerinde görünen sembol ('' ise yok)
     ikon   — menüdeki küçük sembol
     w, h   — varsayılan boyut (tuvalin yüzdesi)
   ============================================================ */

export const SEKIL_TIPLERI = {
  // Yapısal
  stage:    { ad: 'Sahne',           etiket: 'SAHNE',         emoji: '🎤', ikon: '🎤', w: 26, h: 10 },
  wall:     { ad: 'Duvar / Bölme',   etiket: '',              emoji: '',   ikon: '▮',  w: 24, h: 3 },
  // Dolaşım
  door:     { ad: 'Giriş',           etiket: 'GİRİŞ',         emoji: '🚪', ikon: '🚪', w: 11, h: 8 },
  exit:     { ad: 'Çıkış',           etiket: 'ÇIKIŞ',         emoji: '🏃', ikon: '🏃', w: 11, h: 8 },
  arrow:    { ad: 'Yön oku',         etiket: '',              emoji: '➡️', ikon: '➡️', w: 9,  h: 8 },
  // Hizmet alanları
  info:     { ad: 'Kayıt / Danışma', etiket: 'KAYIT',         emoji: '🛎️', ikon: '🛎️', w: 15, h: 10 },
  catering: { ad: 'İkram / Büfe',    etiket: 'İKRAM',         emoji: '☕', ikon: '☕', w: 15, h: 11 },
  waiting:  { ad: 'Bekleme alanı',   etiket: 'BEKLEME ALANI', emoji: '🪑', ikon: '🪑', w: 19, h: 13 },
  wc:       { ad: 'WC',              etiket: 'WC',            emoji: '🚻', ikon: '🚻', w: 10, h: 10 },
  // Serbest
  rect:     { ad: 'Dikdörtgen',      etiket: 'ALAN',          emoji: '',   ikon: '▭',  w: 20, h: 12 },
  circle:   { ad: 'Daire',           etiket: 'ALAN',          emoji: '',   ikon: '◯',  w: 12, h: 14 },
  note:     { ad: 'Not',             etiket: 'NOT',           emoji: '📝', ikon: '📝', w: 16, h: 10 }
};

/* Menüde görünecek gruplama. */
export const SEKIL_GRUPLARI = [
  { baslik: 'Yapısal',  tipler: ['stage', 'wall'] },
  { baslik: 'Dolaşım',  tipler: ['door', 'exit', 'arrow'] },
  { baslik: 'Alanlar',  tipler: ['info', 'catering', 'waiting', 'wc'] },
  { baslik: 'Serbest',  tipler: ['rect', 'circle', 'note'] }
];

export const GECERLI_TIPLER = Object.keys(SEKIL_TIPLERI);

export function sekilTipi(kind) {
  return SEKIL_TIPLERI[kind] || SEKIL_TIPLERI.rect;
}
