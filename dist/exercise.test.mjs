import test from 'node:test';
import assert from 'node:assert/strict';
import { filterOpen, normalizeTitle } from './exercise.mjs';

test('выборка сохраняет порядок и не меняет исходный массив', () => {
  const a = Object.freeze({ id: 5, status: 'open' });
  const b = Object.freeze({ id: 8, status: 'closed' });
  const c = Object.freeze({ id: 9, status: 'open' });
  const data = Object.freeze([a,b,c]);
  const result = filterOpen(data);
  assert.deepEqual(result, [a,c]);
  assert.notStrictEqual(result, data);
});

test('пустой список даёт отдельный пустой результат', () => {
  const data = Object.freeze([]);
  const result = filterOpen(data);
  assert.deepEqual(result, []);
  assert.notStrictEqual(result, data);
});

test('длина считается после удаления крайних пробелов', () => {
  assert.equal(normalizeTitle('  отчёт  '), 'отчёт');
  assert.equal(normalizeTitle('  кот  '), null);
  assert.equal(normalizeTitle('     '), null);
});

test('границы включены, пробелы внутри сохраняются', () => {
  assert.equal(normalizeTitle('abcd'), 'abcd');
  assert.equal(normalizeTitle('x'.repeat(24)), 'x'.repeat(24));
  assert.equal(normalizeTitle('x'.repeat(25)), null);
  assert.equal(normalizeTitle('Отчёт за день'), 'Отчёт за день');
  assert.equal(normalizeTitle(42), null);
});
