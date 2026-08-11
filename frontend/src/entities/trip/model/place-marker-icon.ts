export const PLACE_MARKER_ICONS = [
    'UTENSILS',
    'COFFEE',
    'LANDMARK',
    'TREES',
    'HOTEL',
    'SHOPPING_BAG',
    'STORE',
    'MAP_PIN',
    'SOUP',
    'PIZZA',
    'SANDWICH',
    'CROISSANT',
    'BEER',
    'WAVES',
    'MOUNTAIN',
    'TORII_GATE',
    'PLANE',
    'CAMERA',
    'HEART',
    'STAR',
] as const

export type PlaceMarkerIcon = (typeof PLACE_MARKER_ICONS)[number]

export type PlaceDisplayIcon =
    | PlaceMarkerIcon
    | 'TRAIN'
    | 'BUS'
    | 'CAR'
    | 'SHIP'
    | 'BIKE'
    | 'PARKING'
    | 'ROUTE'

export const PLACE_MARKER_ICON_OPTIONS: ReadonlyArray<{
    value: PlaceMarkerIcon
    label: string
}> = [
    { value: 'UTENSILS', label: '음식' },
    { value: 'COFFEE', label: '카페' },
    { value: 'LANDMARK', label: '명소' },
    { value: 'TREES', label: '자연' },
    { value: 'HOTEL', label: '숙소' },
    { value: 'SHOPPING_BAG', label: '쇼핑' },
    { value: 'STORE', label: '편의점' },
    { value: 'MAP_PIN', label: '장소' },
    { value: 'SOUP', label: '면·국물' },
    { value: 'PIZZA', label: '피자' },
    { value: 'SANDWICH', label: '간편식' },
    { value: 'CROISSANT', label: '베이커리' },
    { value: 'BEER', label: '주점' },
    { value: 'WAVES', label: '해변' },
    { value: 'MOUNTAIN', label: '산' },
    { value: 'TORII_GATE', label: '사찰' },
    { value: 'PLANE', label: '공항' },
    { value: 'CAMERA', label: '사진' },
    { value: 'HEART', label: '추천' },
    { value: 'STAR', label: '즐겨찾기' },
]
