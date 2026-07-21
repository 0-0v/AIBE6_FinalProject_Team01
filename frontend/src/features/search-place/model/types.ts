export type PlaceSearchResult = {
    googlePlaceId: string
    name: string
    address: string
    latitude: number
    longitude: number
    placeType: string | null
    imageUrl: string | null
}
