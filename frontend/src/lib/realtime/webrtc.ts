const defaultIceServers: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
];

export function createPeerConnection(
    iceServers: RTCIceServer[] = defaultIceServers,
) {
    return new RTCPeerConnection({ iceServers });
}
