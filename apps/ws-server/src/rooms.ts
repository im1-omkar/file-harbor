import WebSocket from "ws";

/**
 * - rooms map 
 * 
 * joinRoom()
 * leaveRoom()
 * broadcast()
 */

export const rooms = new Map<string, Set<WebSocket>>();

export function createRoom(roomId : string){
    //if room already exists
    if(!rooms.has(roomId)){
        rooms.set(roomId, new Set());
    }
}

export function joinRoom(roomId: string, socket : WebSocket){
    createRoom(roomId);

    const room = rooms.get(roomId);
    room?.add(socket);
}

export function leaveRoom(roomId : string, socket : WebSocket){
    const room = rooms.get(roomId);

    if(!room) return;

    room.delete(socket);

    //delete room when empty
    if(room.size === 0){
        rooms.delete(roomId);
    }
}

export function broadcast(
    roomId : string,
    sender : WebSocket,
    message : string
){
    const room = rooms.get(roomId);

    if(!room) return;

    room.forEach((client)=>{
        if(
            client!== sender &&
            client.readyState === WebSocket.OPEN
        ){
            client.send(message);
        }
    })
}

