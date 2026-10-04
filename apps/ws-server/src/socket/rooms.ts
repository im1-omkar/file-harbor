import type { Peer } from "../types";

const rooms = new Map<string, Map<string, Peer>>();

//create room
export function createRoom(roomId: string) {
    if (!rooms.has(roomId)) {
        rooms.set(roomId, new Map<string, Peer>());
    }

    return rooms.get(roomId)!;
}

//create room -> set peer in room
export function addPeer(roomId: string, peer: Peer) {
    const room = createRoom(roomId);

    room.set(peer.socketId, peer);

    return room;
}

//get the roomId -> set corresponding peer -> delete the socketId
export function removePeer(roomId: string, socketId: string) {
    const room = rooms.get(roomId);

    if (!room) return null;

    const peer = room.get(socketId);

    room.delete(socketId);

    if (room.size === 0) {
        rooms.delete(roomId);
    }

    return peer ?? null;
}

//return the actual socket
export function getPeer(roomId: string, socketId: string) {
    return rooms.get(roomId)?.get(socketId);
}

export function getPeers(roomId: string): Peer[] {
    return [...(rooms.get(roomId)?.values() ?? [])];
}

export function getRoom(roomId: string) {
    return rooms.get(roomId);
}