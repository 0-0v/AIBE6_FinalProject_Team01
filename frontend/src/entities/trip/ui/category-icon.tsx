import type { LucideIcon } from 'lucide-react'
import {
    BeerIcon,
    BikeIcon,
    BusFrontIcon,
    CameraIcon,
    CarFrontIcon,
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
    RouteIcon,
    SandwichIcon,
    ShoppingBagIcon,
    ShipIcon,
    SoupIcon,
    StarIcon,
    StoreIcon,
    SquareParkingIcon,
    TrainFrontIcon,
    TreesIcon,
    UtensilsIcon,
    WavesIcon,
} from 'lucide-react'
import type { PlaceDisplayIcon } from '../model/place-marker-icon'

const ICONS: Record<PlaceDisplayIcon, LucideIcon> = {
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
    TRAIN: TrainFrontIcon,
    BUS: BusFrontIcon,
    CAR: CarFrontIcon,
    SHIP: ShipIcon,
    BIKE: BikeIcon,
    PARKING: SquareParkingIcon,
    ROUTE: RouteIcon,
    CAMERA: CameraIcon,
    HEART: HeartIcon,
    STAR: StarIcon,
}

type Props = {
    icon: PlaceDisplayIcon | string | null | undefined
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
    const Icon = ICONS[icon as PlaceDisplayIcon] ?? MapPinIcon
    return (
        <Icon
            aria-hidden="true"
            size={size}
            strokeWidth={strokeWidth}
            className={className}
        />
    )
}
