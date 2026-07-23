export type PlaceSearchResult = {
    googlePlaceId: string
    name: string
    address: string
    latitude: number
    longitude: number
    placeType: string | null
    imageUrl: string | null
    rating: number | null
    userRatingCount: number | null
    openNow: boolean | null
    phoneNumber: string | null
    websiteUri: string | null
}
