/** Plutonic office — Marina Plaza, Dubai Marina (exact pin for maps & directions) */
export const OFFICE_LOCATION = {
  name: 'Plutonic Cleaning — Office #411',
  address: 'Office #411, Marina Plaza, Dubai Marina, Dubai, UAE',
  lat: 25.077064,
  lng: 55.139724,
  buildingName: 'Marina Plaza',
};

export function buildMapsEmbedUrl(lat = OFFICE_LOCATION.lat, lng = OFFICE_LOCATION.lng) {
  return `https://maps.google.com/maps?q=${lat},${lng}&hl=en&z=18&output=embed`;
}

export function buildMapsUrl() {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(OFFICE_LOCATION.address)}`;
}

export function buildDirectionsUrl(lat = OFFICE_LOCATION.lat, lng = OFFICE_LOCATION.lng) {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
}

export function buildDirectionsUrlForPlaceId(placeId: string) {
  return `https://www.google.com/maps/dir/?api=1&destination_place_id=${encodeURIComponent(placeId)}&travelmode=driving`;
}
