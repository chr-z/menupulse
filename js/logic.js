// MenuPulse — QR digital menu logic (pure functions, no DOM)
export function slugify(text) {
  return String(text ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function formatBytes(n) {
  if (n < 1024) return `${n} bytes`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function parseCommaDecimal(s) {
  let t = String(s ?? '').replace(/[^\d.,-]/g, '');
  const lC = t.lastIndexOf(',');
  const lD = t.lastIndexOf('.');
  if (lC > -1 && lD > -1) {
    if (lC > lD) t = t.replace(/\./g, '').replace(',', '.');
    else t = t.replace(/,/g, '');
  } else if (lC > -1) {
    t = /,\d{1,2}$/.test(t) ? t.replace(',', '.') : t.replace(/,/g, '');
  }
  const v = Number(t);
  return Number.isFinite(v) ? v : 0;
}

export function formatPrice(cents) {
  const loc = new Intl.NumberFormat(navigator.language || 'en-US', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return loc.format(cents / 100);
}

export function computeSubtotal(items) {
  let s = 0;
  for (const p of items) s += Math.max(0, p.price_cents | 0);
  return s;
}

export function computeTax(subtotal_cents, ratePct = 10) {
  const rate = ratePct / 100;
  return Math.round(subtotal_cents * rate);
}

export function computeTotal(subtotal_cents, tax_cents, discount_cents = 0) {
  return Math.max(0, subtotal_cents + tax_cents - discount_cents);
}

export function catalogRevenueSummary(items, discountPct = 0, taxPct = 10) {
  const subtotal = computeSubtotal(items);
  const tax = computeTax(subtotal, taxPct);
  const total = computeTotal(subtotal, tax, Math.round((subtotal * discountPct) / 100));
  return { count: items.length, subtotal, tax, discount: Math.round((subtotal * discountPct) / 100), total };
}

export function readShareLink(search) {
  try {
    const m = /[?&]d=([^&]+)/.exec(String(search || ''));
    if (!m) return null;
    const json = decodeURIComponent(escape(atob(decodeURIComponent(m[1]))));
    const obj = JSON.parse(json);
    return typeof obj === 'object' && obj !== null ? obj : null;
  } catch {
    return null;
  }
}

export function buildShareLink(baseUrl, pageData) {
  const json = JSON.stringify(pageData);
  const b64 = btoa(unescape(encodeURIComponent(json)));
  const clean = baseUrl.replace(/\/+$/, '');
  return `${clean}/?d=${b64}`;
}

export function normalizePhone(raw) {
  let s = String(raw ?? '').trim();
  if (!s) return '';
  const hasPlus = s.startsWith('+');
  const d = s.replace(/\D/g, '');
  const n = !hasPlus && d.length <= 11 ? '55' + d : d;
  return n ? '+' + n : '';
}

export function waLink(phone, text) {
  if (!phone) return null;
  const base = `https://wa.me/${phone.replace(/\D/g, '')}`;
  const msg = text ? `?text=${encodeURIComponent(text)}` : '';
  return base + msg;
}