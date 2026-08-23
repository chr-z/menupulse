// Minimal MenuPulse app: i18n + form + catalog + share-in-URL + PWA boot.
import { slugify, formatPrice, computeSubtotal, computeTax, computeTotal, catalogRevenueSummary, readShareLink, buildShareLink } from './logic.js';
const SUPPORTED = ['en', 'pt-BR'];
const LS_KEY_PAGE = 'menupulse.page.v1';
const state = {
  name: '',
  bio: '',
  phone: '',
  ctaText: '',
  prefill: '',
  currency: 'BRL',
  discountPct: 0,
  items: [],
};
function save() { localStorage.setItem(LS_KEY_PAGE, JSON.stringify(state)); }
function loadState() { try { const raw = localStorage.getItem(LS_KEY_PAGE); if (raw) Object.assign(state, JSON.parse(raw)); } catch { /* fresh */ } }
function flashSaved() { const b = $('#save-indicator'); b.hidden = false; setTimeout(() => { b.hidden = true; }, 1200); }
function syncFromDom() {
  state.name = $('#f-name').value;
  state.bio = $('#f-bio').value;
  state.phone = $('#f-phone').value;
  state.ctaText = $('#f-cta').value;
  state.prefill = $('#f-msg').value;
  state.currency = $('#f-currency').value;
  state.discountPct = Number($('#f-discount').value) || 0;
  state.items = readItemsFromDom();
  save();
  renderPreview();
  flashSaved();
}
function readItemsFromDom() {
  return [...document.querySelectorAll('#items .item-row')].map((row) => ({
    name: row.querySelector('.i-name').value.trim(),
    price_cents: parseInt(String(row.querySelector('.i-price').value) || '0').replace(/\D/g, '') | 0,
    rawPrice: row.querySelector('.i-price').value,
  })).filter((p) => p.name);
}
function renderItems() {
  const list = $('#items');
  list.innerHTML = '';
  for (const it of state.items) list.appendChild(itemRow(it));
  if (!state.items.length) list.appendChild(itemRow());
}
function itemRow(p = { name: '', price: '' }) {
  const row = document.createElement('div');
  row.className = 'row item-row';
  row.innerHTML = `
    <label class="grow"><span data-i18n="form.itemFields.name">Item name</span>
      <input class="i-name" type="text" value="${p.name.replace(/"/g, '"')}" placeholder="…"></label>
    <label><span data-i18n="form.itemFields.price">Price</span>
      <input class="i-price" type="text" inputmode="decimal" value="${String(p.price).replace(/"/g, '"')}" placeholder="0,00"></label>
    <button class="btn ghost remove" type="button" aria-label="remove">✕</button>`;
  row.querySelector('.i-name').addEventListener('input', syncFromDom);
  row.querySelector('.i-price').addEventListener('input', syncFromDom);
  row.querySelector('.remove').addEventListener('click', () => { row.remove(); syncFromDom(); });
  return row;
}
function renderPreview() {
  const totals = catalogRevenueSummary(state.items, state.discountPct);
  const ul = $('#pv-items'); ul.innerHTML = '';
  for (const it of state.items) {
    const li = document.createElement('li');
    li.innerHTML = `<span></span><strong></strong>`;
    li.firstChild.textContent = it.name;
    li.lastChild.textContent = formatPrice(it.price_cents);
    ul.appendChild(li);
  }
  const sub = document.getElementById('pv-subtotal'); sub.textContent = formatPrice(totals.subtotal);
  const tax = document.getElementById('pv-tax'); tax.textContent = formatPrice(totals.tax);
  const disc = document.getElementById('pv-discount'); disc.textContent = formatPrice(totals.discount);
  const total = document.getElementById('pv-total'); total.textContent = formatPrice(totals.total);
  const pn = normalizePhone(state.phone);
  const link = pn ? waLink(pn, [state.ctaText, state.prefill].filter(Boolean).join('\n')) : null;
  const btn = $('#pv-wa'); if (link) { btn.href = link; btn.hidden = false; } else { btn.hidden = true; }
}
function normalizePhone(raw) { /* same as linkforge logic - simple copy */ let s = String(raw ?? '').trim(); if (!s) return ''; const hasPlus = s.startsWith('+'); const d = s.replace(/\D/g, ''); const n = !hasPlus && d.length <= 11 ? '55' + d : d; return n ? '+' + n : ''; }
function waLink(phone, text) { if (!phone) return null; const base = `https://wa.me/${phone.replace(/\D/g, '')}`; const msg = text ? `?text=${encodeURIComponent(text)}` : ''; return base + msg; }
// share
async function copyShareLink() { const url = buildShareLink(location.origin + location.pathname, pageData()); try { await navigator.clipboard.writeText(url); } catch { prompt('Copy link:', url); } const b = $('#btn-share'); const old = b.textContent; b.textContent = 'Copied!'; setTimeout(() => { b.textContent = old; }, 1500); }
function exportJson() { const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'menupulse-page.json'; a.click(); URL.revokeObjectURL(a.href); }
function importJson(file) { const r = new FileReader(); r.onload = () => { try { Object.assign(state, JSON.parse(String(r.result))); fillForm(); save(); renderPreview(); } catch { alert('Invalid JSON'); } }; r.readAsText(file); }
function fillForm() { $('#f-name').value = state.name; $('#f-bio').value = state.bio; $('#f-phone').value = state.phone; $('#f-cta').value = state.ctaText; $('#f-msg').value = state.prefill; $('#f-currency').value = state.currency; $('#f-discount').value = state.discountPct; renderItems(); }
// demo seed
if (!localStorage.getItem(LS_KEY_PAGE)) {
  $('#f-name').value = 'Pizza Place'; $('#f-bio').value = 'Open since 2019 · best pizza in town'; $('#f-phone').value = '+55 11 91234-5678'; $('#f-discount').value = 10; renderItems();
}
function boot() { loadState(); const init = import('./i18n.js').then((m) => m.initLanguage()); init.then(() => fillForm()); document.querySelectorAll('input, select').forEach((el) => { el.addEventListener('input', syncFromDom); el.addEventListener('change', syncFromDom); }); $('#btn-share').addEventListener('click', copyShareLink); $('#btn-export').addEventListener('click', exportJson); $('#btn-import').addEventListener('change', (e) => e.target.files[0] && importJson(e.target.files[0])); $('#btn-add-item').addEventListener('click', () => { $('#items').appendChild(itemRow()); syncFromDom(); }); renderPreview(); boot(); }
window.__mReady = import('./i18n.js').then((m) => m.initLanguage()).then(() => { window.__mReady = undefined; });
boot();