import type { PlaceCategory } from './types'
import type { PlaceDisplayIcon, PlaceMarkerIcon } from './place-marker-icon'

const AIR_TYPES = new Set([
    'airport',
    'airstrip',
    'heliport',
    'international_airport',
])
const RAIL_TYPES = new Set([
    'light_rail_station',
    'subway_station',
    'train_station',
    'train_ticket_office',
    'tram_stop',
    'transit_depot',
    'transit_station',
    'transit_stop',
])
const BUS_TYPES = new Set(['bus_station', 'bus_stop'])
const CAR_TYPES = new Set(['car_rental', 'taxi_service', 'taxi_stand'])
const FERRY_TYPES = new Set(['ferry_service', 'ferry_terminal'])
const PARKING_TYPES = new Set([
    'park_and_ride',
    'parking',
    'parking_garage',
    'parking_lot',
])

function normalizePlaceType(placeType: string | null | undefined): string {
    return placeType?.trim().toLowerCase() ?? ''
}

export function resolvePlaceDisplayIcon(
    category: PlaceCategory,
    categoryIcon: PlaceMarkerIcon | string | null | undefined,
    placeType: string | null | undefined,
): PlaceDisplayIcon {
    if (category !== 'transport') {
        return (categoryIcon as PlaceMarkerIcon | undefined) ?? 'MAP_PIN'
    }

    const normalizedType = normalizePlaceType(placeType)
    if (AIR_TYPES.has(normalizedType)) return 'PLANE'
    if (RAIL_TYPES.has(normalizedType)) return 'TRAIN'
    if (BUS_TYPES.has(normalizedType)) return 'BUS'
    if (CAR_TYPES.has(normalizedType)) return 'CAR'
    if (FERRY_TYPES.has(normalizedType)) return 'SHIP'
    if (PARKING_TYPES.has(normalizedType)) return 'PARKING'
    if (normalizedType === 'bike_sharing_station') return 'BIKE'
    return 'ROUTE'
}

export function isAnchorPlace(
    category: PlaceCategory,
    placeType: string | null | undefined,
): boolean {
    if (category === 'lodging') return true
    if (category !== 'transport') return false

    const normalizedType = normalizePlaceType(placeType)
    return AIR_TYPES.has(normalizedType) || normalizedType === 'train_station'
}
