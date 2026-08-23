import test from 'node:test';
import assert from 'node:assert/strict';
import { slugify, formatPrice, computeSubtotal, computeTax, computeTotal, catalogRevenueSummary, readShareLink, buildShareLink, normalizePhone, waLink, parseCommaDecimal } from '../js/logic.js';

test('slugify handles accents and spaces', () => {
  assert.equal(slugify('  Pizza & mais  '), 'pizza-mais');
  assert.equal(slugify('Ação'), 'acao');
});

test('normalizePhone respects explicit +DDD, defaults for short numbers', () => {
  assert.equal(normalizePhone('+1 (415) 555-0100'), '+14155550100');
  assert.equal(normalizePhone('(11) 91234-5678'), '+5511912345678');
  assert.equal(normalizePhone('5511987654321'), '+5511987654321');
  assert.equal(normalizePhone(''), '');
});

test('waLink builds wa.me URL', () => {
  const url = waLink('+5511987654321', 'Olá quero pizza');
  assert.ok(url.startsWith('https://wa.me/5511987654321?text='));
  assert.ok(url.includes(encodeURIComponent('Olá')));
  assert.equal(waLink('', 'x'), null);
});

test('computeSubtotal sums price_cents', () => {
  assert.equal(computeSubtotal([{ price_cents: 1000 }, { price_cents: 2500 }]), 3500);
});

test('computeTax rounds down', () => {
  assert.equal(computeTax(3500, 10), 350);
});

test('computeTotal does subtotal + tax - discount', () => {
  assert.equal(computeTotal(3500, 350, 200), 3650);
});

test('catalogRevenueSummary returns all fields', () => {
  const { count, subtotal, tax, discount, total } = catalogRevenueSummary(
    [{ price_cents: 1200 }, { price_cents: 3000 }, { price_cents: 500 }],
    10
  );
  assert.equal(count, 3);
  assert.equal(subtotal, 4700);
  assert.equal(tax, 470);
  assert.equal(discount, 470);
  // total = 4700 + 470 - 470 = 4700
  assert.equal(total, 4700);
});

test('catalogRevenueSummary returns all fields with discount', () => {
  const { count, subtotal, tax, discount, total } = catalogRevenueSummary(
    [{ price_cents: 1000 }], 500
  );
  // discount = round(1000 * 500 / 100) = 5000, but total floor is 0
  assert.equal(count, 1);
  assert.equal(subtotal, 1000);
  assert.equal(tax, 100);
  assert.equal(total, 0); // Math.max(0, 1000+100-5000) = 0
});

test('catalogRevenueSummary with no discount returns correct total', () => {
  const { subtotal, tax, total } = catalogRevenueSummary(
    [{ price_cents: 1000 }, { price_cents: 2000 }]
  );
  assert.equal(subtotal, 3000);
  assert.equal(tax, 300);
  assert.equal(total, 3300);
});

test('readShareLink returns null on garbage', () => {
  assert.equal(readShareLink('?d=%%%'), null);
  assert.equal(readShareLink(''), null);
});

test('buildShareLink round-trips page data', () => {
  const data = { name: 'Pizza Place', items: [{ name: 'Margherita', price_cents: 3500 }, { name: 'Caipirinha', price_cents: 2500 }] };
  const url = buildShareLink('https://chr-z.github.io/menupulse/', data);
  assert.ok(url.includes('?d='));
  const back = readShareLink(new URL(url).search);
  assert.deepEqual(back, data);
});

test('formatPrice renders BRL with explicit locale (pure, no navigator)', () => {
  assert.match(formatPrice(3500, 'BRL', 'pt-BR'), /R\$\s?35,00/);
  assert.match(formatPrice(1250, 'BRL', 'pt-BR'), /R\$\s?12,50/);
  assert.match(formatPrice(0, 'BRL', 'pt-BR'), /R\$\s?0,00/);
});

test('formatPrice is locale/currency parametrized (global-first)', () => {
  assert.match(formatPrice(3500, 'USD', 'en-US'), /\$35\.00/);
  assert.match(formatPrice(3500, 'EUR', 'de-DE'), /35,00\s?€/);
  assert.match(formatPrice(3500, 'BRL', 'pt-BR'), /R\$\s?35,00/);
  assert.doesNotMatch(formatPrice(3500, 'USD', 'en-US'), /R\$/);
  assert.equal(formatPrice(123456, 'JPY', 'ja-JP'), '￥123,456');
  // unknown currency falls back safely instead of throwing
  assert.ok(formatPrice(100, 'XXX', 'en-US').length > 0);
});

test('parseCommaDecimal round-trips pt-BR', () => {
  assert.equal(parseCommaDecimal('1.234,56'), 1234.56);
  assert.equal(parseCommaDecimal('45,00'), 45.00);
  assert.equal(parseCommaDecimal('38.50'), 38.50);
  assert.equal(parseCommaDecimal('abc'), 0);
});