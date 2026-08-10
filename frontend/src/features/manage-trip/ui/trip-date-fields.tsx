type TripDateFieldsProps = {
    startDate: string
    endDate: string
    onStartDateChange: (value: string) => void
    onEndDateChange: (value: string) => void
}

export function TripDateFields({
    startDate,
    endDate,
    onStartDateChange,
    onEndDateChange,
}: TripDateFieldsProps) {
    return (
        <div className="mt-3.5 grid grid-cols-2 gap-3">
            <label className="text-sm font-bold">
                시작일
                <input
                    type="date"
                    value={startDate}
                    onChange={(event) => onStartDateChange(event.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-normal"
                />
            </label>
            <label className="text-sm font-bold">
                종료일
                <input
                    type="date"
                    value={endDate}
                    min={startDate || undefined}
                    onChange={(event) => onEndDateChange(event.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-normal"
                />
            </label>
        </div>
    )
}
