type GoogleMapsPlace = {
    name: string
    lat: number
    lng: number
    googlePlaceId?: string
}

export function buildGoogleMapsPlaceUrl({
    name,
    lat,
    lng,
    googlePlaceId,
}: GoogleMapsPlace): string {
    const parameters = new URLSearchParams({
        api: '1',
        query: googlePlaceId ? name : `${lat},${lng}`,
        utm_source: 'plamingo',
        utm_campaign: 'place_details',
    })
    if (googlePlaceId) {
        parameters.set('query_place_id', googlePlaceId)
    }
    return `https://www.google.com/maps/search/?${parameters.toString()}`
}
