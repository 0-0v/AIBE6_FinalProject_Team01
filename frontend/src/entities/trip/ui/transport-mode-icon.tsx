import {
    BusIcon,
    CarIcon,
    CarTaxiFrontIcon,
    FootprintsIcon,
    TrainFrontIcon,
} from 'lucide-react'

type Props = {
    mode: string | null
    size?: number
}

export function TransportModeIcon({ mode, size = 10 }: Props) {
    if (mode === '도보') return <FootprintsIcon size={size} />
    if (
        mode === '지하철' ||
        mode === '기차' ||
        mode === '트램' ||
        mode === '철도'
    ) {
        return <TrainFrontIcon size={size} />
    }
    if (mode === '대중교통' || mode === '버스') {
        return <BusIcon size={size} />
    }
    if (mode === '택시') return <CarTaxiFrontIcon size={size} />
    if (mode === '자동차') return <CarIcon size={size} />
    return null
}
