/* ============================================================
   SALON PLANI ŞEKİL TİPLERİ

   Salon krokisinde masaların dışında kalan öğeler. Görüşme
   eşleştirmesini hiçbir şekilde etkilemezler; yalnızca firmaların
   salonu okuyabilmesi için görsel referanstır.

   Bu kayıt defteri tek doğruluk kaynağıdır: hem şekil ekleme menüsü
   hem de kayıtlı verinin doğrulaması (store.js) buradan beslenir.
   Yeni bir tip eklemek için buraya bir satır ve style.css'e karşılık
   gelen bir sınıf eklemek yeterlidir.
   ============================================================ */

export const SEKIL_TIPLERI = {
  // Yapısal
  stage:    { ad: 'Sahne',          etiket: 'SAHNE',          ikon: '▬', w: 26, h: 10 },
  wall:     { ad: 'Duvar / Bölme',  etiket: '',               ikon: '▮', w: 24, h: 3 },
  // Dolaşım
  door:     { ad: 'Giriş',          etiket: 'GİRİŞ',          ikon: '⇥', w: 11, h: 6 },
  exit:     { ad: 'Çıkış',          etiket: 'ÇIKIŞ',          ikon: '⇤', w: 11, h: 6 },
  arrow:    { ad: 'Yön oku',        etiket: '→',              ikon: '➜', w: 9,  h: 7 },
  // Hizmet alanları
  info:     { ad: 'Kayıt / Danışma', etiket: 'KAYIT',         ikon: 'ℹ', w: 15, h: 8 },
  catering: { ad: 'İkram / Büfe',   etiket: 'İKRAM',          ikon: '☕', w: 15, h: 10 },
  waiting:  { ad: 'Bekleme alanı',  etiket: 'BEKLEME ALANI',  ikon: '⌛', w: 19, h: 12 },
  wc:       { ad: 'WC',             etiket: 'WC',             ikon: '🚻', w: 9,  h: 8 },
  // Serbest
  rect:     { ad: 'Dikdörtgen',     etiket: 'ALAN',           ikon: '▭', w: 20, h: 12 },
  circle:   { ad: 'Daire',          etiket: 'ALAN',           ikon: '◯', w: 12, h: 14 },
  note:     { ad: 'Not',            etiket: 'NOT',            ikon: '✎', w: 16, h: 9 }
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
