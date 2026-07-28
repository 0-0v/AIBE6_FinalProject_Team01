type Coordinates = {
    lat: number
    lng: number
}

function toGoogleTravelMode(mode: string | null) {
    if (mode === '도보') return 'walking'
    if (mode === '지하철' || mode === '버스' || mode === '대중교통') {
        return 'transit'
    }
    return 'driving'
}

export function buildGoogleMapsDirectionsUrl(
    origin: Coordinates,
    destination: Coordinates,
    transportMode: string | null,
) {
    const parameters = new URLSearchParams({
        api: '1',
        origin: `${origin.lat},${origin.lng}`,
        destination: `${destination.lat},${destination.lng}`,
        travelmode: toGoogleTravelMode(transportMode),
        utm_source: 'plamingo',
        utm_campaign: 'itinerary_directions',
    })
    return `https://www.google.com/maps/dir/?${parameters.toString()}`
}
