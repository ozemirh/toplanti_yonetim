/* ============================================================
   MODAL (onay/uyarı/girdi penceresi)
   ============================================================ */
import { esc } from '../utils.js';

export function closeModal() {
  document.getElementById('modalOverlay')?.remove();
  document.removeEventListener('keydown', modalKey);
}
function modalKey(e) { if (e.key === 'Escape') closeModal(); }

export function openModal(o) {
  const { title = '', message = '', showInput = false, inputValue = '', confirmText = 'TAMAM',
          cancelText = 'VAZGEÇ', danger = false, alertOnly = false, onConfirm = null,
          bodyHtml = '', onOpen = null, wide = false } = o || {};
  closeModal();
  const ov = document.createElement('div');
  ov.className = 'modal-overlay'; ov.id = 'modalOverlay';
  ov.innerHTML = `<div class="modal-box${wide ? ' wide' : ''}" role="dialog" aria-modal="true">
    <div class="modal-header"><h3>${esc(title)}</h3></div>
    <div class="modal-body">
      ${message ? `<p>${esc(message)}</p>` : ''}
      ${showInput ? `<input id="modalInput" type="text" value="${esc(inputValue)}" autocomplete="off">` : ''}
      ${bodyHtml}
    </div>
    <div class="modal-actions">
      ${alertOnly ? '' : `<button type="button" class="ghost" id="modalCancel">${esc(cancelText)}</button>`}
      <button type="button" class="${danger ? 'red' : ''}" id="modalConfirm">${esc(confirmText)}</button>
    </div></div>`;
  document.getElementById('modalRoot').appendChild(ov);
  ov.addEventListener('mousedown', e => { if (e.target === ov) closeModal(); });

  const c = document.getElementById('modalConfirm');
  const inp = document.getElementById('modalInput');
  c.addEventListener('click', () => { const v = inp ? inp.value : true; closeModal(); if (onConfirm) onConfirm(v); });
  document.getElementById('modalCancel')?.addEventListener('click', closeModal);
  document.addEventListener('keydown', modalKey);
  if (inp) { inp.addEventListener('keydown', e => { if (e.key === 'Enter') c.click(); }); setTimeout(() => { inp.focus(); inp.select(); }, 0); }
  else setTimeout(() => c.focus(), 0);
  if (typeof onOpen === 'function') onOpen(ov);
}
