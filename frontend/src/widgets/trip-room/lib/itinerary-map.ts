export const ITINERARY_MAP_MIN_ZOOM = 3

export const ITINERARY_MAP_BOUNDS = {
    north: 85,
    south: -85,
    east: 180,
    west: -180,
}

export const ITINERARY_DAY_COLORS = DESIGN_COLORS.itineraryDays

export function getItineraryDayColor(dayNumber: number): string {
    const index =
        (((dayNumber - 1) % ITINERARY_DAY_COLORS.length) +
            ITINERARY_DAY_COLORS.length) %
        ITINERARY_DAY_COLORS.length
    return ITINERARY_DAY_COLORS[index]
}

export function hasMapCoordinates(location: {
    lat: number
    lng: number
}): boolean {
    return location.lat !== 0 || location.lng !== 0
}
import { DESIGN_COLORS } from '@/shared/config'
