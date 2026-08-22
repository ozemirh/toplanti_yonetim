/* ============================================================
   DURUM (STATE) — tek kaynak, localStorage'da saklanır.
   ============================================================ */
import { makeId, normalizeName } from './utils.js';

export const STORAGE_KEY = 'b2b_match_state';

/* Modül dışından okunurken canlı (live binding) değer görülür;
   yazmak için setState() kullanılmalıdır (yalnızca bu modülün
   kendi kapsamındaki `state` doğrudan atanabilir). */
export let state = null;

export function setState(next) {
  state = next;
  return state;
}

export function defaultState() {
  return {
    version: 1,
    eventName: '',
    formUrl: '',
    webAppUrl: '',   // Apps Script web uygulaması adresi (formu tek tıkla üretir)
    sheetId: '',     // yanıt tablosu kimliği (boşsa betik en son oluşturduğunu kullanır)
    autoSync: false, // yanıt tablosunu düzenli aralıklarla otomatik çekme
    lastSyncCount: 0, // en son alınan yanıt satırı sayısı (yinelenmeyi önler)
    qrImage: '',   // yüklenen sabit QR görseli (data URL)
    weights: { ilkGorusme: 22, sure: 6, yogunluk: 2.5, karsilikli: 14 },
    firms: [],        // etkinliğe katılan firmaların resmi listesi
    firmAliases: {},  // firmaAnahtar → onaylanmış esas firma adı
    startTime: '09:00',
    endTime: '18:00',
    defaultDuration: 15,
    tables: [
      { id: 't1', title: 'MASA 1', x: 6, y: 8, w: 26, h: 30 },
      { id: 't2', title: 'MASA 2', x: 37, y: 8, w: 26, h: 30 },
      { id: 't3', title: 'MASA 3', x: 68, y: 8, w: 26, h: 30 }
    ],
    shapes: [],       // salon planındaki dekoratif öğeler: {id,kind,label,x,y,w,h}
    requests: [],     // {id, from, to, duration, order, createdAt}
    schedule: [],     // {id, from, to, duration, tableId, tableTitle, start, end, mutual}
    unscheduled: [],
    live: {}          // tableId → {index, running, secondsLeft, warned, ended, startedAt}
  };
}

/* Salon planındaki masaları ızgaraya göre otomatik dizer.
   Sabit kart boyutu (w×h yüzde) kullanır; sıra numarasına göre
   satır/sütuna yerleştirir. Elle sürüklenen masalar bu diziden
   etkilenmez (yalnızca sıfırlama veya yeni masa eklerken çağrılır). */
export function autoPosition(index, w = 26, h = 30) {
  const alanX = 4, alanY = 6, alanW = 92, alanH = 88;
  const sutun = Math.max(1, Math.floor((alanW + 6) / (w + 6)));
  const col = index % sutun, row = Math.floor(index / sutun);
  const bosX = alanW - sutun * w; const araX = sutun > 1 ? bosX / (sutun - 1) : 0;
  return {
    x: Math.min(96 - w, alanX + col * (w + araX)),
    y: Math.min(94 - h, alanY + row * (h + 8)),
    w, h
  };
}

export function normalizeState(raw) {
  const d = defaultState();
  const s = (raw && typeof raw === 'object') ? raw : {};
  const tables = Array.isArray(s.tables) && s.tables.length
    ? s.tables.map((t, i) => {
        const gecerliSayi = (v) => Number.isFinite(Number(v)) && Number(v) >= 0 && Number(v) <= 100;
        const pos = gecerliSayi(t?.x) && gecerliSayi(t?.y) ? { x: Number(t.x), y: Number(t.y) } : autoPosition(i);
        return {
          id: typeof t?.id === 'string' ? t.id : makeId('t'),
          title: normalizeName(t?.title) || `MASA ${i + 1}`,
          x: pos.x, y: pos.y,
          w: gecerliSayi(t?.w) ? Number(t.w) : 26,
          h: gecerliSayi(t?.h) ? Number(t.h) : 30
        };
      })
    : d.tables;

  const gecerliSayi = (v) => Number.isFinite(Number(v)) && Number(v) >= 0 && Number(v) <= 100;
  const shapes = Array.isArray(s.shapes)
    ? s.shapes.filter(sh => sh && typeof sh === 'object').map((sh, i) => ({
        id: typeof sh.id === 'string' ? sh.id : makeId('sh'),
        kind: ['rect', 'circle', 'note'].includes(sh.kind) ? sh.kind : 'rect',
        label: normalizeName(sh.label) || 'NOT',
        x: gecerliSayi(sh.x) ? Number(sh.x) : 10 + i * 6,
        y: gecerliSayi(sh.y) ? Number(sh.y) : 70,
        w: gecerliSayi(sh.w) ? Number(sh.w) : 12,
        h: gecerliSayi(sh.h) ? Number(sh.h) : 10
      }))
    : [];

  const requests = (Array.isArray(s.requests) ? s.requests : []).map((r, i) => ({
    id: typeof r?.id === 'string' ? r.id : makeId('r'),
    from: normalizeName(r?.from), to: normalizeName(r?.to),
    duration: Math.max(1, Number(r?.duration) || 15),
    order: Number.isFinite(Number(r?.order)) ? Number(r.order) : i,
    createdAt: r?.createdAt || ''
  })).filter(r => r.from && r.to);

  return {
    version: 1,
    eventName: normalizeName(s.eventName),
    formUrl: String(s.formUrl || '').trim(),
    webAppUrl: String(s.webAppUrl || '').trim(),
    sheetId: String(s.sheetId || '').trim(),
    autoSync: !!s.autoSync,
    lastSyncCount: Number.isFinite(Number(s.lastSyncCount)) ? Number(s.lastSyncCount) : 0,
    qrImage: typeof s.qrImage === 'string' && s.qrImage.startsWith('data:image') ? s.qrImage : '',
    weights: {
      ilkGorusme: Number.isFinite(Number(s.weights?.ilkGorusme)) ? Number(s.weights.ilkGorusme) : 22,
      sure: Number.isFinite(Number(s.weights?.sure)) ? Number(s.weights.sure) : 6,
      yogunluk: Number.isFinite(Number(s.weights?.yogunluk)) ? Number(s.weights.yogunluk) : 2.5,
      karsilikli: Number.isFinite(Number(s.weights?.karsilikli)) ? Number(s.weights.karsilikli) : 14
    },
    firms: Array.isArray(s.firms) ? [...new Set(s.firms.map(normalizeName).filter(Boolean))] : [],
    firmAliases: (s.firmAliases && typeof s.firmAliases === 'object') ? s.firmAliases : {},
    startTime: /^\d{2}:\d{2}$/.test(String(s.startTime || '')) ? s.startTime : d.startTime,
    endTime: /^\d{2}:\d{2}$/.test(String(s.endTime || '')) ? s.endTime : d.endTime,
    defaultDuration: Math.max(1, Number(s.defaultDuration) || 15),
    tables,
    shapes,
    requests,
    schedule: Array.isArray(s.schedule) ? s.schedule : [],
    unscheduled: Array.isArray(s.unscheduled) ? s.unscheduled : [],
    live: (s.live && typeof s.live === 'object') ? s.live : {}
  };
}

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? normalizeState(JSON.parse(raw)) : defaultState();
  } catch (e) { return defaultState(); }
}
export function saveState() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  catch (e) { console.warn('Yerel kayıt yapılamadı'); }
}
