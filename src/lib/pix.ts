/** BR Code estático do Pix (Manual de Padrões para Iniciação do Pix, Banco Central), sem valor: a pessoa digita no app do banco. */
const field = (id: string, value: string) => `${id}${String(value.length).padStart(2, '0')}${value}`

// Nome e cidade só em ASCII: alguns bancos recusam acento no BR Code.
const ascii = (s: string, max: number) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\x20-\x7E]/g, '').trim().slice(0, max)

/** CRC16-CCITT (poly 0x1021, início 0xFFFF), exigido no campo 63. */
export const crc16 = (s: string) => {
  let crc = 0xffff
  for (const ch of s) {
    crc ^= ch.charCodeAt(0) << 8
    for (let i = 0; i < 8; i++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff
  }
  return crc.toString(16).toUpperCase().padStart(4, '0')
}

export function pixCode({ key, name, city }: { key: string; name: string; city: string }) {
  const payload =
    field('00', '01') +
    field('26', field('00', 'br.gov.bcb.pix') + field('01', key.trim())) +
    field('52', '0000') +
    field('53', '986') +
    field('58', 'BR') +
    field('59', ascii(name, 25)) +
    field('60', ascii(city, 15)) +
    field('62', field('05', '***')) +
    '6304'
  return payload + crc16(payload)
}
