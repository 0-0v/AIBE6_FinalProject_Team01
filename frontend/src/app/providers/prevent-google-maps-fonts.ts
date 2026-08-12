let installed = false

export function preventGoogleMapsFontLoading() {
    if (installed || typeof document === 'undefined') return

    const head = document.head
    const insertBefore = head.insertBefore.bind(head)

    head.insertBefore = ((newNode: Node, referenceNode: Node | null) => {
        if (
            newNode instanceof HTMLLinkElement &&
            newNode.rel === 'stylesheet' &&
            newNode.href.includes('fonts.googleapis.com') &&
            /family=(Roboto|Google\+Sans)/.test(newNode.href)
        ) {
            return newNode
        }
        return insertBefore(newNode, referenceNode)
    }) as typeof head.insertBefore

    installed = true
}
