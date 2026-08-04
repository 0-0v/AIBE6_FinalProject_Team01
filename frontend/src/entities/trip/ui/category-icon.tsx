import type { LucideIcon } from 'lucide-react'
import {
    BeerIcon,
    CameraIcon,
    ChurchIcon,
    CoffeeIcon,
    CroissantIcon,
    HeartIcon,
    HotelIcon,
    LandmarkIcon,
    MapPinIcon,
    MountainIcon,
    PizzaIcon,
    PlaneIcon,
    SandwichIcon,
    ShoppingBagIcon,
    SoupIcon,
    StarIcon,
    StoreIcon,
    TreesIcon,
    UtensilsIcon,
    WavesIcon,
} from 'lucide-react'
import type { PlaceMarkerIcon } from '../model/place-marker-icon'

const ICONS: Record<PlaceMarkerIcon, LucideIcon> = {
    UTENSILS: UtensilsIcon,
    COFFEE: CoffeeIcon,
    LANDMARK: LandmarkIcon,
    TREES: TreesIcon,
    HOTEL: HotelIcon,
    SHOPPING_BAG: ShoppingBagIcon,
    STORE: StoreIcon,
    MAP_PIN: MapPinIcon,
    SOUP: SoupIcon,
    PIZZA: PizzaIcon,
    SANDWICH: SandwichIcon,
    CROISSANT: CroissantIcon,
    BEER: BeerIcon,
    WAVES: WavesIcon,
    MOUNTAIN: MountainIcon,
    TORII_GATE: ChurchIcon,
    PLANE: PlaneIcon,
    CAMERA: CameraIcon,
    HEART: HeartIcon,
    STAR: StarIcon,
}

type Props = {
    icon: PlaceMarkerIcon | string | null | undefined
    size?: number
    className?: string
    strokeWidth?: number
}

export function CategoryIcon({
    icon,
    size = 16,
    className,
    strokeWidth = 2,
}: Props) {
    const Icon = ICONS[icon as PlaceMarkerIcon] ?? MapPinIcon
    return (
        <Icon
            aria-hidden="true"
            size={size}
            strokeWidth={strokeWidth}
            className={className}
        />
    )
}
