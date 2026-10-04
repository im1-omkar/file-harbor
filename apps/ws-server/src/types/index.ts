
import type { Socket } from "socket.io";


export interface Peer {
    socketId: string;
    name: string;
    device: string;
}

export interface JoinRoomPayload {
    roomId: string;
    name: string;
    device: string;
}

export interface ConnectionPayload {
    targetSocketId: string;
}

export interface SessionDescription {
    type: "offer" | "answer" | "pranswer" | "rollback";
    sdp?: string;
}

export interface IceCandidate {
    candidate: string;
    sdpMid?: string | null;
    sdpMLineIndex?: number | null;
    usernameFragment?: string | null;
}

export interface OfferPayload extends ConnectionPayload {
    offer: SessionDescription;
}

export interface AnswerPayload extends ConnectionPayload {
    answer: SessionDescription;
}

export interface IceCandidatePayload extends ConnectionPayload {
    candidate: IceCandidate;
}

export interface ServerToClientEvents {
    "room-updated": (data: {
        roomId: string;
        peers: Peer[];
    }) => void;

    "connection-request": (data: {
        from: string;
        peer: Peer;
    }) => void;

    "connection-accepted": (data: {
        from: string;
    }) => void;

    "connection-rejected": (data: {
        from: string;
    }) => void;

    "webrtc-offer": (data: {
        from: string;
        offer: SessionDescription;
    }) => void;

    "webrtc-answer": (data: {
        from: string;
        answer: SessionDescription;
    }) => void;

    "ice-candidate": (data: {
        from: string;
        candidate: IceCandidate;
    }) => void;

    "peer-disconnected": (data: {
        socketId: string;
    }) => void;
}

// -------------------------------
// CLIENT → SERVER EVENTS
// -------------------------------

export interface ClientToServerEvents {
    "join-room": (
        data: JoinRoomPayload,
        ack: (response: JoinRoomResponse) => void
    ) => void;

    "request-connection": (
        data: ConnectionPayload,
        ack: (response: AckResponse) => void
    ) => void;

    "accept-connection": (
        data: ConnectionPayload,
        ack: (response: AckResponse) => void
    ) => void;

    "reject-connection": (
        data: ConnectionPayload
    ) => void;

    "webrtc-offer": (
        data: OfferPayload
    ) => void;

    "webrtc-answer": (
        data: AnswerPayload
    ) => void;

    "ice-candidate": (
        data: IceCandidatePayload
    ) => void;

    "leave-room": () => void;
}

// -------------------------------
// SOCKET.IO INTERNAL TYPES
// -------------------------------

export interface InterServerEvents { }

export interface SocketData {
    currentRoom: string | null;
}

export interface AckResponse {
    success: boolean;
    message?: string;
}

export interface JoinRoomResponse extends AckResponse {
    roomId?: string;
    peers?: Peer[];
}

export type FileHarborSocket = Socket<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
>;
