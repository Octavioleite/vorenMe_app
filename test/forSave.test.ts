// node --experimental-strip-types --test test/forSave.test.ts
// O que o editor envia (forSave) precisa passar na validação real da API, mesmo no meio da digitação.
import test from 'node:test'
import assert from 'node:assert/strict'
import { forSave, socialFrom, socialText, waNumber } from '../src/painel/forSave.ts'
import { blockOrder, CARD_BLOCKS } from '../src/config/types.ts'
// @ts-expect-error JS da API, sem tipos
import { validateCardConfig } from '../../vorenMe_api/src/dto/card/config.js'
// @ts-expect-error JS da API, sem tipos
import templates from '../../vorenMe_api/src/templates/index.js'

test('itens pela metade não travam o salvamento', () => {
  for (const t of templates) {
    const c = structuredClone(t.config)
    c.name.last = ''
    c.photo.alt = ''
    c.socials.push({ platform: 'instagram', handle: '', url: '' })
    c.address = { text: 'Rua A, 1', hours: [{ days: 'Seg', time: '' }] }
    c.coupons = [{ brand: 'Marca', code: '' }]
    c.brands = [{ name: '' }]
    c.now = { title: 'Agora', text: '' }
    c.featured = { title: '', platform: 'youtube', url: '', kind: 'video', image: { src: '', alt: '' } }
    c.connect = {
      goal: 'clientes', title: '  ', audience: '',
      actions: [
        { id: 'ok', label: 'Deixar contato', channel: 'form', message: ' ' },
        { id: 'semnome', label: '', channel: 'form' },
        { id: 'semlink', label: 'Site', channel: 'link', url: '' },
        { id: 'tel', label: 'Ligar', channel: 'phone', phone: '119' },
      ],
      services: [{ id: 's1', name: 'Clareamento', action: 'semnome' }, { id: 's2', name: '', action: 'ok' }, { id: 's3', name: 'Implante', action: 'ok' }],
    }
    const out = forSave(c)
    assert.deepEqual(validateCardConfig(out), [], t.id)
    assert.deepEqual(out.connect!.actions.map((a) => a.id), ['ok'])
    assert.deepEqual(out.connect!.services!.map((s) => s.id), ['s3'])
  }
})

test('link sem https ganha https; esquema perigoso continua barrado', () => {
  const c = structuredClone(templates[0].config)
  c.socials = [{ platform: 'website', handle: 'site', url: 'site.com.br' }]
  c.website = { url: 'www.site.com', label: 'site' }
  const out = forSave(c)
  assert.equal(out.socials[0].url, 'https://site.com.br')
  assert.equal(out.website!.url, 'https://www.site.com')
  assert.deepEqual(validateCardConfig(out), [])
  c.socials[0].url = 'javascript:alert(1)'
  assert.equal(validateCardConfig(forSave(c)).length, 1)
})

test('ordem dos blocos: completa o que falta, tira desconhecido e repetido, bate com a API', () => {
  const o = blockOrder({ order: ['cupons', 'xx', 'destaque', 'cupons'] })
  assert.deepEqual(o, ['cupons', 'destaque', 'redes', 'local', 'pix', 'chamada', 'extra', 'marcas'])
  assert.deepEqual(blockOrder({}), Object.keys(CARD_BLOCKS))
  const c = structuredClone(templates[0].config)
  c.order = o
  assert.deepEqual(validateCardConfig(forSave(c)), [])
})

test('WhatsApp e redes num campo só', () => {
  assert.equal(waNumber('(11) 98765-4321'), '5511987654321')
  assert.equal(waNumber('+55 11 98765-4321'), '5511987654321')
  assert.equal(waNumber('1133334444'), '551133334444')
  assert.deepEqual(socialFrom('instagram', '@fulana'), { handle: '@fulana', url: 'https://instagram.com/fulana' })
  assert.deepEqual(socialFrom('tiktok', 'fulana'), { handle: '@fulana', url: 'https://tiktok.com/@fulana' })
  assert.deepEqual(socialFrom('instagram', 'https://www.instagram.com/fulana/?hl=pt'), { handle: '@fulana', url: 'https://www.instagram.com/fulana/?hl=pt' })
  assert.deepEqual(socialFrom('website', 'meusite.com.br'), { handle: 'meusite.com.br', url: 'meusite.com.br' })
  assert.deepEqual(socialFrom('spotify', 'artista'), { handle: '@artista', url: '' })
  assert.deepEqual(socialFrom('x', ''), { handle: '', url: '' })
  assert.equal(socialText({ platform: 'instagram', ...socialFrom('instagram', 'fulana') }), '@fulana')
  assert.equal(socialText({ platform: 'instagram', ...socialFrom('instagram', 'instagram.com/fulana') }), 'instagram.com/fulana')
})

test('elemento solto ainda vazio (texto apagado, imagem enviando) não trava o salvamento', () => {
  const c = structuredClone(templates[0].config)
  c.extras = [
    { id: 'a1', kind: 'text', text: '  ', x: 50, y: 20, size: 9 },
    { id: 'b2', kind: 'image', src: '', x: 10, y: 10, size: 30 },
    { id: 'c3', kind: 'shape', x: 0, y: 100, size: 100, ratio: 3 },
  ]
  const out = forSave(c)
  assert.deepEqual(out.extras?.map((x) => x.id), ['c3'])
  assert.deepEqual(validateCardConfig(out), [])
})
