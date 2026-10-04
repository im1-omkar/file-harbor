import { WebSocketServer, WebSocket } from "ws";

import {
    rooms,
    joinRoom,
    leaveRoom,
    broadcast
} from "./src/rooms.ts";

const wss = new WebSocketServer({
    port : 8080
});


// track which room each socket belongs to  (reverse of what rooms has implemented)
const clientRooms = new Map<WebSocket, string>();


wss.on("connection",(socket)=>{
    console.log("new peer connected");

    socket.on("message", (rawMessage)=>{
        try{
            const message = JSON.parse(rawMessage.toString());

            switch(message.type){

                case "join-room" : {
                    const {roomId} = message;

                    if(
                        typeof roomId !== "string" ||
                        roomId.length === 0 ||
                        roomId.length > 128
                    ){
                        socket.send(JSON.stringify({
                            type : "error",
                            message : "Invalid room ID"
                        }));

                        return;
                    }

                    //don't alow multiple rooms per socket
                    if(clientRooms.has(socket)){
                        socket.send(JSON.stringify({
                            type : "error",
                            message : "Already in a room"
                        }));
                        return;
                    }

                    joinRoom(roomId, socket);
                    clientRooms.set(socket,roomId);

                    socket.send(JSON.stringify({
                        type : "joined-room",
                        roomId
                    }));

                    //notify other parts
                    broadcast(
                        roomId,
                        socket,
                        JSON.stringify({
                            type : "peer-joined"
                        })
                    );

                    console.log(`Peer Joined room : ${roomId}`);
                    break;
                }

                //relay webRTC signaling messages 
                case "signal" : {
                    const roomId = clientRooms.get(socket);

                    if(!roomId) return;

                    broadcast(
                        roomId,
                        socket,
                        JSON.stringify({
                            type : "signal",
                            data : message.data
                        })
                    );

                    break;
                }

                //leave room
                case "leave-room" : {
                    const roomId = clientRooms.get(socket);

                    if(!roomId) return;

                    leaveRoom(roomId, socket);
                    clientRooms.delete(socket);

                    broadcast(
                        roomId,
                        socket,
                        JSON.stringify({
                            type : "peer-left"
                        })
                    );

                    break;
                }

                default : 
                    socket.send(JSON.stringify({
                        type : "error",
                        message : "unknown message type"
                    }));
            }
            
        }catch{
            socket.send(JSON.stringify({
                type: "error",
                message: "Invalid JSON"
            }));
        } 
    });
    
    socket.on("close", ()=>{

            const roomId = clientRooms.get(socket);

            if(!roomId) return;

            leaveRoom(roomId, socket);
            clientRooms.delete(socket);

            broadcast(
                roomId,
                socket,
                JSON.stringify({
                    type : "peer-left"
                })
            )

            console.log(`Peer disconnected from room : ${roomId}`);
    });

})

console.log("web-socket server running on ws://localhost : 8080");