// node --experimental-strip-types --test test/textLayout.test.ts
// Textos sobre a foto: celular e computador com ajustes separados, cartões antigos sem mudança.
import test from 'node:test'
import assert from 'node:assert/strict'
import { textLayout } from '../src/config/types.ts'

const desk = { first: { x: 10, y: 20 } }
const mob = { first: { size: 40 } }

test('cartão antigo (sem layoutMobile): celular usa o mesmo ajuste de antes', () => {
  assert.deepEqual(textLayout({ layout: desk }, true), desk)
  assert.deepEqual(textLayout({ layout: desk }, false), desk)
})
test('cada tela usa o seu ajuste', () => {
  assert.deepEqual(textLayout({ layout: desk, layoutMobile: mob }, true), mob)
  assert.deepEqual(textLayout({ layout: desk, layoutMobile: mob }, false), desk)
})
test('celular restaurado ({}) fica no padrão, sem copiar o computador', () => {
  assert.deepEqual(textLayout({ layout: desk, layoutMobile: {} }, true), {})
})
test('sem ajuste nenhum: padrão do modelo', () => {
  assert.deepEqual(textLayout({}, true), {})
  assert.deepEqual(textLayout({}, false), {})
})
