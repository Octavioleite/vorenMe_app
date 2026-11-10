/** Links de rota a partir do endereço em texto (sem API key: cada app geocodifica sozinho). */
export const placeLinks = (address: string) => {
  const q = encodeURIComponent(address)
  return {
    maps: `https://www.google.com/maps/search/?api=1&query=${q}`,
    waze: `https://waze.com/ul?q=${q}&navigate=yes`,
    uber: `https://m.uber.com/ul/?action=setPickup&pickup=my_location&dropoff[formatted_address]=${q}`,
  }
}
