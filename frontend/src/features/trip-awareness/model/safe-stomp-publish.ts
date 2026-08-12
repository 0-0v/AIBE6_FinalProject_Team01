export type StompPublisher = {
    connected: boolean
    publish: (frame: { destination: string; body: string }) => void
}

export function safeStompPublish(
    client: StompPublisher,
    destination: string,
    body: string,
): boolean {
    if (!client.connected) return false

    try {
        client.publish({ destination, body })
        return true
    } catch {
        return false
    }
}
