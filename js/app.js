// MenuPulse app: i18n + form + catalog + WhatsApp checkout + share-in-URL + PWA boot.
import { slugify, formatPrice, parseCommaDecimal, computeSubtotal, computeTax, computeTotal, catalogRevenueSummary, readShareLink, buildShareLink, normalizePhone, waLink } from './logic.js';

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

let i18n = null;

const $ = (sel) => document.querySelector(sel);

function save() {
  localStorage.setItem(LS_KEY_PAGE, JSON.stringify(state));
}

function loadState() {
  try {
    const raw = localStorage.getItem(LS_KEY_PAGE);
    if (raw) Object.assign(state, JSON.parse(raw));
  } catch { /* fresh */ }
}

function seedDemo() {
  Object.assign(state, {
    name: 'Pizza Place',
    bio: 'Open since 2019 · best pizza in town',
    phone: '+55 11 91234-5678',
    ctaText: '',
    prefill: '',
    currency: 'BRL',
    discountPct: 10,
    items: [
      { name: 'Margherita', price_cents: 3500 },
      { name: 'Pepperoni', price_cents: 4200 },
      { name: 'Soda', price_cents: 800 },
    ],
  });
  save();
}

function money(cents) {
  const loc = document.documentElement.lang === 'pt-BR' ? 'pt-BR' : 'en-US';
  return formatPrice(cents, state.currency, loc);
}

let savedTimer = null;
function flashSaved() {
  $('#save-indicator').hidden = false;
  clearTimeout(savedTimer);
  savedTimer = setTimeout(() => { $('#save-indicator').hidden = true; }, 1200);
}

function readItemsFromDom() {
  return [...document.querySelectorAll('#items .item-row')].map((row) => {
    const raw = row.querySelector('.i-price').value;
    return {
      name: row.querySelector('.i-name').value.trim(),
      price_cents: Math.round(parseCommaDecimal(raw) * 100),
      rawPrice: raw,
    };
  }).filter((p) => p.name);
}

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

function itemRow(p = {}) {
  const priceVal = p.rawPrice != null ? p.rawPrice : (p.price_cents ? String(p.price_cents / 100) : '');
  const row = document.createElement('div');
  row.className = 'row item-row';
  row.innerHTML = `
    <label class="grow">
      <span data-i18n="form.itemFields.name">Item name</span>
      <input class="i-name" type="text" value="${String(p.name ?? '').replace(/"/g, '&quot;')}" placeholder="…">
    </label>
    <label>
      <span data-i18n="form.itemFields.price">Price</span>
      <input class="i-price" type="text" inputmode="decimal" value="${String(priceVal).replace(/"/g, '&quot;')}" placeholder="0,00">
    </label>
    <button class="btn ghost remove" type="button" aria-label="remove">✕</button>`;
  row.querySelector('.i-name').addEventListener('input', syncFromDom);
  row.querySelector('.i-price').addEventListener('input', syncFromDom);
  row.querySelector('.remove').addEventListener('click', () => { row.remove(); syncFromDom(); });
  return row;
}

function renderItems() {
  const list = $('#items');
  list.innerHTML = '';
  for (const it of state.items) list.appendChild(itemRow(it));
  if (!state.items.length) list.appendChild(itemRow());
}

function pageData() {
  return {
    name: state.name || 'Restaurant',
    bio: state.bio,
    phone: normalizePhone(state.phone),
    ctaText: state.ctaText,
    prefill: state.prefill,
    currency: state.currency,
    discountPct: state.discountPct,
    items: state.items.filter((it) => it.name).map(({ name, price_cents }) => ({ name, price_cents })),
  };
}

function renderPreview() {
  const d = pageData();
  $('#pv-avatar').textContent = (d.name || 'M').trim().charAt(0).toUpperCase() || 'M';
  $('#pv-name').textContent = d.name;
  $('#pv-bio').textContent = d.bio || '';
  const totals = catalogRevenueSummary(d.items, d.discountPct);
  const ul = $('#pv-items');
  ul.innerHTML = '';
  for (const it of d.items) {
    const li = document.createElement('li');
    li.innerHTML = `<span></span><strong></strong>`;
    li.firstChild.textContent = it.name;
    li.lastChild.textContent = money(it.price_cents);
    ul.appendChild(li);
  }
  const sub = document.getElementById('pv-subtotal'); sub.textContent = money(totals.subtotal);
  const tax = document.getElementById('pv-tax'); tax.textContent = money(totals.tax);
  const disc = document.getElementById('pv-discount'); disc.textContent = `−${money(totals.discount)}`;
  document.querySelector('.discount-line').style.display = totals.discount > 0 ? '' : 'none';
  const total = document.getElementById('pv-total'); total.textContent = money(totals.total);
  const cnt = document.getElementById('pv-count');
  cnt.textContent = `${totals.count} ${i18n ? i18n.t('preview.items') : 'items'}`;
  const pn = normalizePhone(state.phone);
  const msg = [state.ctaText, state.prefill].filter(Boolean).join('\n');
  const link = pn ? waLink(pn, msg) : null;
  const btn = $('#pv-wa');
  if (link) { btn.href = link; btn.hidden = false; } else { btn.hidden = true; }
}

async function copyShareLink() {
  const base = location.origin + location.pathname.replace(/index\.html$/, '');
  const url = buildShareLink(base, pageData());
  try {
    await navigator.clipboard.writeText(url);
  } catch {
    prompt('Copy link:', url);
  }
  const b = $('#btn-share');
  const old = b.textContent;
  b.textContent = i18n ? i18n.t('form.copied') : 'Copied!';
  setTimeout(() => { b.textContent = old; }, 1500);
}

function exportJson() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'menupulse-menu.json';
  a.click();
  URL.revokeObjectURL(a.href);
}

function importJson(file) {
  const r = new FileReader();
  r.onload = () => {
    try {
      Object.assign(state, JSON.parse(String(r.result)));
      fillForm();
      save();
      renderPreview();
    } catch { alert('Invalid JSON'); }
  };
  r.readAsText(file);
}

function fillForm() {
  $('#f-name').value = state.name;
  $('#f-bio').value = state.bio;
  $('#f-phone').value = state.phone;
  $('#f-cta').value = state.ctaText;
  $('#f-msg').value = state.prefill;
  $('#f-currency').value = state.currency;
  $('#f-discount').value = state.discountPct;
  renderItems();
}

function wireEvents() {
  document.querySelectorAll('#editor input, #editor select').forEach((el) => {
    el.addEventListener('input', syncFromDom);
    el.addEventListener('change', syncFromDom);
  });
  $('#btn-share').addEventListener('click', copyShareLink);
  $('#btn-export').addEventListener('click', exportJson);
  $('#btn-import').addEventListener('change', (e) => e.target.files[0] && importJson(e.target.files[0]));
  $('#btn-add-item').addEventListener('click', () => { $('#items').appendChild(itemRow()); });
}

async function boot() {
  // A shared link (?d=…) opens the shared menu; otherwise local draft or first-run demo.
  const shared = /[?&]d=/.test(location.search) ? readShareLink(location.search) : null;
  if (shared) {
    Object.assign(state, shared);
  } else {
    loadState();
    if (!localStorage.getItem(LS_KEY_PAGE)) seedDemo();
  }
  i18n = await import('./i18n.js');
  await i18n.initLanguage();
  fillForm();
  wireEvents();
  renderPreview();
}

window.__mReady = boot();
