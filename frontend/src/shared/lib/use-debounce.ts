import { useCallback, useEffect, useRef } from 'react'

export function useDebounce<Args extends unknown[]>(
    fn: (...args: Args) => void,
    delay: number,
): (...args: Args) => void {
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const fnRef = useRef(fn)

    useEffect(() => {
        fnRef.current = fn
    }, [fn])

    useEffect(() => {
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current)
        }
    }, [])

    return useCallback(
        (...args: Args) => {
            if (timerRef.current) clearTimeout(timerRef.current)
            timerRef.current = setTimeout(() => fnRef.current(...args), delay)
        },
        [delay],
    )
}
