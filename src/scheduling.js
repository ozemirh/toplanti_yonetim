/* ============================================================
   PLANLAMA MOTORU
   Talepleri masalara/zaman dilimlerine dağıtan çekirdek mantık.
   ============================================================ */
import { state, saveState } from './store.js';
import { upper, parseClock } from './utils.js';
import { esasAd } from './firmMatching.js';
import { defaultState } from './store.js';

export function pairKey(a, b) { return [upper(a), upper(b)].sort().join(' ||| '); }

/* Karşılıklı ve yinelenen talepleri tek görüşmeye indirger.
   En erken talep sırası korunur, süre olarak en uzunu alınır. */
export function mergeRequests(requests) {
  const map = new Map();
  requests.forEach((req, i) => {
    // Kullanıcının onayladığı birleştirmeler burada uygulanır ki
    // aynı firmanın yazım varyantları tek firma sayılsın.
    const from = esasAd(req.from), to = esasAd(req.to);
    if (!from || !to || upper(from) === upper(to)) return;
    const key = pairKey(from, to);
    const dur = Math.max(1, Number(req.duration) || 15);
    const ord = Number.isFinite(Number(req.order)) ? Number(req.order) : i;
    const cur = map.get(key);
    if (!cur) { map.set(key, { id: req.id, from, to, duration: dur, order: ord, mutual: false }); return; }
    cur.duration = Math.max(cur.duration, dur);
    cur.order = Math.min(cur.order, ord);
    cur.mutual = true;
  });
  return [...map.values()].sort((a, b) => a.order - b.order);
}

export const overlaps = (s1, e1, s2, e2) => s1 < e2 && s2 < e1;
export const isFree = (list, s, e) => !list.some(iv => overlaps(s, e, iv.start, iv.end));

/* ---------- PUANLAMA ----------
   Talepler sabit bir sırayla değil, her adımda yeniden hesaplanan
   önceliğe göre yerleştirilir. Böylece bir firma görüşme aldıkça
   sonraki talepleri geriye düşer ve herkes önce bir tur alır. */
export function talepPuani(is, atanan, talepSayisi, agirlik) {
  const a = atanan[upper(is.from)] || 0;
  const b = atanan[upper(is.to)] || 0;
  const yogunluk = talepSayisi[upper(is.from)] || 1;

  let p = 100;
  p -= agirlik.ilkGorusme * Math.min(a, 6);      // talep eden zaten görüşme aldıysa
  p -= agirlik.ilkGorusme * Math.min(b, 6) * 0.6; // hedef firma doluysa (daha hafif)
  p -= agirlik.sure * (is.duration / 15);         // uzun görüşme biraz geride
  p -= agirlik.yogunluk * Math.min(yogunluk, 12); // çok talep atan firma biraz geride
  if (is.mutual) p += agirlik.karsilikli;         // iki taraf da istiyorsa öne
  p -= is.order * 0.02;                           // eşitlikte önce talep eden kazanır
  return p;
}

/* İki firmanın ve bir masanın aynı anda boş olduğu en erken anı bulur.
   Öncelik puanına göre bekleyen işleri verilen dolu takvimlere
   yerleştirir. hem tam program oluşturma (sıfırdan) hem de otomatik
   senkronizasyonun mevcut programı bozmadan ekleme yapması bu ortak
   fonksiyon üzerinden çalışır. */
export function isleriYerlestir(bekleyen, tables, firmaBusy, masaBusy, atanan, talepSayisi, agirlik, startM, endM) {
  const scheduled = [], unscheduled = [];
  const busyOf = (ad) => {
    const k = upper(ad);
    if (!firmaBusy.has(k)) firmaBusy.set(k, []);
    return firmaBusy.get(k);
  };

  while (bekleyen.length) {
    let secilen = 0, enIyi = -Infinity;
    bekleyen.forEach((is, idx) => {
      const p = talepPuani(is, atanan, talepSayisi, agirlik);
      if (p > enIyi) { enIyi = p; secilen = idx; }
    });
    const is = bekleyen.splice(secilen, 1)[0];

    const aB = busyOf(is.from), bB = busyOf(is.to), sure = is.duration;

    const adaylar = new Set([startM]);
    [...aB, ...bB].forEach(iv => adaylar.add(iv.end));
    masaBusy.forEach(l => l.forEach(iv => adaylar.add(iv.end)));
    const sirali = [...adaylar].filter(t => t >= startM).sort((x, y) => x - y);

    let ok = false;
    for (const bas of sirali) {
      const bit = bas + sure;
      if (bit > endM) break;
      if (!isFree(aB, bas, bit) || !isFree(bB, bas, bit)) continue;
      const uygun = tables.filter(t => isFree(masaBusy.get(t.id), bas, bit))
        .sort((x, y) => masaBusy.get(x.id).length - masaBusy.get(y.id).length);
      if (!uygun.length) continue;
      const masa = uygun[0];
      scheduled.push({ id: is.id, from: is.from, to: is.to, duration: sure, mutual: is.mutual,
                       tableId: masa.id, tableTitle: masa.title, start: bas, end: bit });
      aB.push({ start: bas, end: bit }); bB.push({ start: bas, end: bit });
      masaBusy.get(masa.id).push({ start: bas, end: bit });
      atanan[upper(is.from)] = (atanan[upper(is.from)] || 0) + 1;
      atanan[upper(is.to)] = (atanan[upper(is.to)] || 0) + 1;
      ok = true; break;
    }
    if (!ok) unscheduled.push({ ...is, reason: 'Etkinlik saatleri içinde uygun boşluk yok' });
  }
  return { scheduled, unscheduled };
}

/* Sıfırdan tam program oluşturur — masa/sayaç durumlarını da
   sıfırlar. "PROGRAMI OLUŞTUR" düğmesiyle elle tetiklenir. */
export function buildSchedule() {
  const startM = parseClock(state.startTime) ?? 540;
  const endM = parseClock(state.endTime) ?? 1080;
  const tables = state.tables;
  const agirlik = state.weights || defaultState().weights;
  const bekleyen = mergeRequests(state.requests);

  const talepSayisi = {};
  bekleyen.forEach(is => { const k = upper(is.from); talepSayisi[k] = (talepSayisi[k] || 0) + 1; });

  const firmaBusy = new Map();
  const masaBusy = new Map();
  const atanan = {};
  tables.forEach(t => masaBusy.set(t.id, []));

  const { scheduled, unscheduled } = isleriYerlestir(bekleyen, tables, firmaBusy, masaBusy, atanan, talepSayisi, agirlik, startM, endM);

  scheduled.sort((a, b) => a.start - b.start || String(a.tableTitle).localeCompare(String(b.tableTitle), 'tr'));
  state.schedule = scheduled;
  state.unscheduled = unscheduled;
  state.live = {};
  state.tables.forEach(t => { state.live[t.id] = { index: 0, running: false, secondsLeft: 0, warned: false, ended: false }; });
  saveState();
}

/* Otomatik senkronizasyondan yeni talep geldiğinde çağrılır.
   Zaten programlanmış görüşmelere ve çalışan sayaçlara DOKUNMAZ;
   yalnızca henüz yerleştirilmemiş talepleri mevcut takvimlerin
   üzerine, boş kalan zamanlara ekler. */
export function otomatikProgramGuncelle() {
  if (!state.requests.length) return false;
  const startM = parseClock(state.startTime) ?? 540;
  const endM = parseClock(state.endTime) ?? 1080;
  const tables = state.tables;
  const agirlik = state.weights || defaultState().weights;

  const tumIsler = mergeRequests(state.requests);
  const talepSayisi = {};
  tumIsler.forEach(is => { const k = upper(is.from); talepSayisi[k] = (talepSayisi[k] || 0) + 1; });

  // Zaten programlanmış çiftleri (firma A ↔ firma B) hariç tut.
  const mevcutCiftler = new Set(state.schedule.map(s => pairKey(s.from, s.to)));
  const yeniIsler = tumIsler.filter(is => !mevcutCiftler.has(pairKey(is.from, is.to)));
  if (!yeniIsler.length) return false;

  // Takvimleri MEVCUT programdan kur — sıfırdan değil. Böylece
  // çalışan/geçmiş görüşmeler aynen korunur.
  const firmaBusy = new Map();
  const masaBusy = new Map();
  const atanan = {};
  tables.forEach(t => masaBusy.set(t.id, []));
  state.schedule.forEach(s => {
    const iv = { start: s.start, end: s.end };
    if (masaBusy.has(s.tableId)) masaBusy.get(s.tableId).push(iv);
    const af = upper(s.from), at = upper(s.to);
    if (!firmaBusy.has(af)) firmaBusy.set(af, []);
    if (!firmaBusy.has(at)) firmaBusy.set(at, []);
    firmaBusy.get(af).push(iv);
    firmaBusy.get(at).push(iv);
    atanan[af] = (atanan[af] || 0) + 1;
    atanan[at] = (atanan[at] || 0) + 1;
  });

  const { scheduled: yeniScheduled, unscheduled: yeniUnscheduled } =
    isleriYerlestir(yeniIsler, tables, firmaBusy, masaBusy, atanan, talepSayisi, agirlik, startM, endM);

  if (yeniScheduled.length) {
    state.schedule = [...state.schedule, ...yeniScheduled]
      .sort((a, b) => a.start - b.start || String(a.tableTitle).localeCompare(String(b.tableTitle), 'tr'));
  }
  state.unscheduled = yeniUnscheduled;

  // Yeni eklenen masalar için sayaç kaydı aç; mevcutlara dokunma.
  state.tables.forEach(t => {
    if (!state.live[t.id]) state.live[t.id] = { index: 0, running: false, secondsLeft: 0, warned: false, ended: false };
  });

  saveState();
  return yeniScheduled.length > 0;
}

export function tableMeetings(tableId) { return state.schedule.filter(s => s.tableId === tableId); }
export function liveOf(tableId) {
  if (!state.live[tableId]) state.live[tableId] = { index: 0, running: false, secondsLeft: 0, warned: false, ended: false };
  return state.live[tableId];
}
export function currentMeeting(tableId) { return tableMeetings(tableId)[liveOf(tableId).index] || null; }
export function nextMeeting(tableId) { return tableMeetings(tableId)[liveOf(tableId).index + 1] || null; }
