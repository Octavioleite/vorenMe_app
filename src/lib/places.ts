export type Geo = { lat: number; lng: number }

/** Links de rota (sem API key). Com coordenadas (localização atual), a rota cai no ponto exato. */
export const placeLinks = (address: string, geo?: Geo) => {
  const q = encodeURIComponent(address)
  if (geo) {
    const ll = `${geo.lat},${geo.lng}`
    return {
      maps: `https://www.google.com/maps/search/?api=1&query=${ll}`,
      waze: `https://waze.com/ul?ll=${ll}&navigate=yes`,
      uber: `https://m.uber.com/ul/?action=setPickup&pickup=my_location&dropoff[latitude]=${geo.lat}&dropoff[longitude]=${geo.lng}&dropoff[formatted_address]=${q}`,
    }
  }
  return {
    maps: `https://www.google.com/maps/search/?api=1&query=${q}`,
    waze: `https://waze.com/ul?q=${q}&navigate=yes`,
    uber: `https://m.uber.com/ul/?action=setPickup&pickup=my_location&dropoff[formatted_address]=${q}`,
  }
}

/** CEP -> "Rua X, Bairro, Cidade - UF" (ViaCEP, grátis, sem chave). null = CEP não existe. */
export const addressFromCep = async (cep: string) => {
  const r = await fetch(`https://viacep.com.br/ws/${cep.replace(/\D/g, '')}/json/`)
  const j = await r.json()
  if (j.erro) return null
  return [j.logradouro, j.bairro, `${j.localidade} - ${j.uf}`].filter(Boolean).join(', ')
}

/** Coordenadas -> endereço legível (OpenStreetMap Nominatim). Falhou: as coordenadas bastam para os links. */
export const addressFromGeo = async ({ lat, lng }: Geo) => {
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=pt-BR`)
    const a = (await r.json()).address ?? {}
    const street = [a.road, a.house_number].filter(Boolean).join(', ')
    const city = [a.city ?? a.town ?? a.village, a['ISO3166-2-lvl4']?.replace('BR-', '')].filter(Boolean).join(' - ')
    return [street, a.suburb, city].filter(Boolean).join(', ') || null
  } catch { return null }
}
