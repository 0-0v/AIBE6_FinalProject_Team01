import type { TravelStyle } from '../api/trip-api'
import { MAX_TRAVEL_STYLE_COUNT } from '../model/travel-style-policy'

const TRAVEL_STYLE_OPTIONS: ReadonlyArray<{
    value: TravelStyle
    label: string
}> = [
    { value: 'ACTIVITY', label: '액티비티' },
    { value: 'SNS_HOT_PLACE', label: 'SNS 핫플레이스' },
    { value: 'NATURE', label: '자연과 함께' },
    { value: 'FAMOUS_ATTRACTIONS', label: '유명관광지 필수' },
    { value: 'RELAXATION', label: '여유롭게 힐링' },
    { value: 'CULTURE_ART_HISTORY', label: '문화/예술/역사' },
    { value: 'SHOPPING', label: '쇼핑' },
    { value: 'FOOD', label: '맛집 먹거리' },
]

type Props = {
    selectedStyles: TravelStyle[]
    onToggle: (style: TravelStyle) => void
}

export function TravelStyleSelector({ selectedStyles, onToggle }: Props) {
    return (
        <fieldset className="mt-3.5">
            <legend className="text-sm font-bold">
                여행 스타일{' '}
                <span className="font-normal text-slate-400">
                    (최대 {MAX_TRAVEL_STYLE_COUNT}개)
                </span>
            </legend>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
                {TRAVEL_STYLE_OPTIONS.map((style) => {
                    const selected = selectedStyles.includes(style.value)
                    return (
                        <button
                            key={style.value}
                            type="button"
                            onClick={() => onToggle(style.value)}
                            disabled={
                                selectedStyles.length >=
                                    MAX_TRAVEL_STYLE_COUNT && !selected
                            }
                            className={`rounded-full px-2.5 py-1.5 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-40 ${selected ? 'bg-brand text-white' : 'bg-slate-100 text-slate-500'}`}
                        >
                            {style.label}
                        </button>
                    )
                })}
            </div>
        </fieldset>
    )
}
