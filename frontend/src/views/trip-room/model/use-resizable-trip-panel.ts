import { useCallback, useEffect, useState, type RefObject } from 'react'

const DEFAULT_PANEL_WIDTH = 'min(520px, 46vw)'

export function useResizableTripPanel(
    workspacePanelRef: RefObject<HTMLElement | null>,
) {
    const [customPanelWidth, setCustomPanelWidth] = useState<number | null>(
        null,
    )
    const [isResizingPanel, setIsResizingPanel] = useState(false)

    const clampPanelWidth = useCallback(
        (width: number) => {
            const minimumWidth = 360
            const workspaceWidth =
                workspacePanelRef.current?.parentElement?.getBoundingClientRect()
                    .width ?? window.innerWidth
            const maximumWidth = Math.max(
                minimumWidth,
                Math.min(900, workspaceWidth - 360),
            )
            return Math.min(Math.max(width, minimumWidth), maximumWidth)
        },
        [workspacePanelRef],
    )

    useEffect(() => {
        if (!isResizingPanel) return

        function handlePointerMove(event: PointerEvent) {
            const panelRight =
                workspacePanelRef.current?.getBoundingClientRect().right ??
                window.innerWidth
            setCustomPanelWidth(clampPanelWidth(panelRight - event.clientX))
        }

        function handlePointerUp() {
            setIsResizingPanel(false)
        }

        const previousCursor = document.body.style.cursor
        const previousUserSelect = document.body.style.userSelect
        document.body.style.cursor = 'col-resize'
        document.body.style.userSelect = 'none'
        window.addEventListener('pointermove', handlePointerMove)
        window.addEventListener('pointerup', handlePointerUp)
        window.addEventListener('pointercancel', handlePointerUp)

        return () => {
            document.body.style.cursor = previousCursor
            document.body.style.userSelect = previousUserSelect
            window.removeEventListener('pointermove', handlePointerMove)
            window.removeEventListener('pointerup', handlePointerUp)
            window.removeEventListener('pointercancel', handlePointerUp)
        }
    }, [clampPanelWidth, isResizingPanel, workspacePanelRef])

    function handleResizeKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
        if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return

        event.preventDefault()
        const currentWidth =
            customPanelWidth ??
            workspacePanelRef.current?.getBoundingClientRect().width ??
            400
        const direction = event.key === 'ArrowLeft' ? 1 : -1
        setCustomPanelWidth(clampPanelWidth(currentWidth + direction * 20))
    }

    return {
        panelWidth:
            customPanelWidth == null
                ? DEFAULT_PANEL_WIDTH
                : `${customPanelWidth}px`,
        isResizingPanel,
        currentPanelWidth: customPanelWidth,
        startResizing: (initialWidth?: number) => {
            if (initialWidth != null) {
                setCustomPanelWidth(clampPanelWidth(initialWidth))
            }
            setIsResizingPanel(true)
        },
        handleResizeKeyDown,
        resetPanelWidth: () => setCustomPanelWidth(null),
    }
}
