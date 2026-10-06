import type { Peer } from "./peer";

export interface JoinRoomResponse {
    success: boolean;
    message?: string;
    roomId?: string;
    peers?: Peer[];
}

export interface ActionResponse {
    success: boolean;
    message?: string;
}

export interface ConnectionRequest {
    from: string;
    peer: Peer;
}

export interface RoomUpdatedPayload {
    peers: Peer[];
}

export interface WebRTCOffer {
    type: RTCSdpType;
    sdp?: string;
}

export interface WebRTCAnswer {
    type: RTCSdpType;
    sdp?: string;
}

export interface WebRTCOfferPayload {
    from: string;
    offer: WebRTCOffer;
}

export interface WebRTCAnswerPayload {
    from: string;
    answer: WebRTCAnswer;
}

export interface IceCandidatePayload {
    from: string;
    candidate: RTCIceCandidateInit;
}

export interface PeerDisconnectedPayload {
    socketId: string;
}