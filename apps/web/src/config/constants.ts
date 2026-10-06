export const SERVER_URL =
    import.meta.env.VITE_SIGNALING_SERVER_URL ||
    "http://localhost:3000";

export const CHUNK_SIZE = 64 * 1024;

export const BUFFER_LIMIT = 1024 * 1024;

export const ICE_SERVERS: RTCConfiguration = {
    iceServers: [
        {
            urls: "stun:stun.l.google.com:19302",
        },
    ],
};