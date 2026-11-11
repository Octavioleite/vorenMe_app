// node --experimental-strip-types --test test/forSave.test.ts
// O que o editor envia (forSave) precisa passar na validação real da API, mesmo no meio da digitação.
import test from 'node:test'
import assert from 'node:assert/strict'
import { forSave } from '../src/painel/forSave.ts'
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
    assert.deepEqual(validateCardConfig(forSave(c)), [], t.id)
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
