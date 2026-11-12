// node --experimental-strip-types --test test/links.test.ts
// Mensagem contextualizada do Conecta: o que chega escrito no WhatsApp/e-mail do dono.
import test from 'node:test'
import assert from 'node:assert/strict'
import { actionHref, actionMessage } from '../src/lib/links.ts'
import type { ConnectAction } from '../src/config/types.ts'

const aval: ConnectAction = { id: 'aval', label: 'Solicitar avaliação', channel: 'whatsapp', message: 'Olá! Encontrei seu cartão no VorenMe e gostaria de solicitar informações sobre uma avaliação.' }
const clar = { id: 'clar', name: 'Clareamento dental', action: 'aval' }
const card = { whatsapp: { number: '5519900000000' }, email: { address: 'clinica@x.com' } }
const text = (href?: string) => new URL(href!).searchParams.get('text')

test('WhatsApp abre com a mensagem do dono; vindo de um serviço, o serviço vai junto', () => {
  assert.equal(text(actionHref(aval, card)), aval.message)
  assert.equal(text(actionHref(aval, card, clar)), `${aval.message} Interesse: Clareamento dental.`)
  assert.ok(actionHref(aval, card)!.startsWith('https://wa.me/5519900000000?text='))
})

test('{servico} é trocado pelo nome; sem serviço, some', () => {
  const a = { ...aval, message: 'Quero saber sobre {servico}, por favor.' }
  assert.equal(actionMessage(a, clar), 'Quero saber sobre Clareamento dental, por favor.')
  assert.equal(actionMessage(a), 'Quero saber sobre, por favor.')
})

test('sem mensagem: texto padrão com o nome da ação', () => {
  assert.equal(actionMessage({ ...aval, message: '' }), 'Olá! Encontrei seu cartão no VorenMe e tenho interesse em: Solicitar avaliação.')
})

test('outros destinos', () => {
  assert.equal(actionHref({ id: 't', label: 'Ligar', channel: 'phone', phone: '1133334444' }, card), 'tel:+551133334444')
  assert.equal(actionHref({ id: 't', label: 'Ligar', channel: 'phone', phone: '351912345678' }, card), 'tel:+351912345678')
  assert.equal(actionHref({ id: 'e', label: 'Proposta', channel: 'email' }, card, clar), 'mailto:clinica@x.com?subject=Proposta%3A%20Clareamento%20dental')
  assert.equal(actionHref({ id: 'l', label: 'Site', channel: 'link', url: 'https://x.com' }, card), 'https://x.com')
  assert.equal(actionHref({ id: 'f', label: 'Form', channel: 'form' }, card), undefined)
  assert.equal(actionHref(aval, {}), undefined) // sem WhatsApp cadastrado, o botão não aparece
})
