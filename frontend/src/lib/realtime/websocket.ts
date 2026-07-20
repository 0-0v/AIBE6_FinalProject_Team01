export function createWebSocket(url = process.env.NEXT_PUBLIC_WS_URL) {
    if (!url) {
        throw new Error('NEXT_PUBLIC_WS_URL이 설정되지 않았습니다.');
    }

    return new WebSocket(url);
}
