import { creator } from '../config/creator'
import { fullName, pageUrl } from '../config/derived'
import { tagged } from './track'

const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([,;])/g, '\\$1')

/** vCard 3.0, the most widely supported version (iOS, Android, Outlook). */
export function buildVCard() {
  const c = creator
  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `N:${esc(c.name.last)};${esc(c.name.first)};;;`,
    `FN:${esc(fullName)}`,
    `NICKNAME:${esc(c.username)}`,
    `TITLE:${esc(c.niche)}`,
    c.whatsapp && `TEL;TYPE=CELL:+${c.whatsapp.number.replace(/\D/g, '')}`,
    c.email && `EMAIL;TYPE=INTERNET,WORK:${c.email.address}`,
    c.location && `ADR;TYPE=WORK:;;;${esc(c.location)};;;`,
    `URL:${tagged(pageUrl(), 'contato')}`,
    c.website && `URL;TYPE=HOME:${c.website.url}`,
    ...c.socials.map((s) => `X-SOCIALPROFILE;TYPE=${s.platform}:${s.url}`),
    `NOTE:${esc(c.bio)}`,
    'END:VCARD',
  ].filter(Boolean)
  return lines.join('\r\n')
}

export const vcardFileName = () =>
  `${fullName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')}.vcf`
