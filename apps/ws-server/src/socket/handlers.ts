import type { Server } from "socket.io";

import { addPeer, removePeer, getPeer, getPeers } from "./rooms";

import type {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
  FileHarborSocket,
  Peer,
} from "../types";

const MAX_ROOM_SIZE = 10;

type FileHarborServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

function isValidString(value: unknown, maxLength = 100): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    value.length <= maxLength
  );
}

function isRoomPeer(
  roomId: string | null,
  senderId: string,
  targetId: string,
): boolean {
  if (!roomId || senderId === targetId) return false;

  return Boolean(getPeer(roomId, senderId) && getPeer(roomId, targetId));
}

export function registerHandlers(
  io: FileHarborServer,
  socket: FileHarborSocket,
) {
  // join the room
  socket.on("join-room", ({ roomId, name, device }, ack) => {
    if (
      !isValidString(roomId, 64) ||
      !isValidString(name, 50) ||
      !isValidString(device, 255)
    ) {
      return ack({
        success: false,
        message: "Invalid peer details",
      });
    }

    if (socket.data.currentRoom) {
      return ack({
        success: false,
        message: "Already in a room",
      });
    }

    roomId = roomId.trim();

    if (getPeers(roomId).length >= MAX_ROOM_SIZE) {
      return ack({
        success: false,
        message: "Room is full",
      });
    }

    const peer: Peer = {
      socketId: socket.id,
      name: name.trim(),
      device: device.trim(),
    };

    addPeer(roomId, peer);

    socket.data.currentRoom = roomId;
    socket.join(roomId);

    io.to(roomId).emit("room-updated", {
      roomId,
      peers: getPeers(roomId),
    });

    ack({
      success: true,
      roomId,
      peers: getPeers(roomId).filter((peer) => peer.socketId !== socket.id),
    });
  });

  // connection request
  socket.on("request-connection", ({ targetSocketId }, ack) => {
    const roomId = socket.data.currentRoom;

    if (!isRoomPeer(roomId, socket.id, targetSocketId)) {
      return ack({
        success: false,
        message: "Peer not found",
      });
    }

    const peer = getPeer(roomId!, socket.id)!;

    io.to(targetSocketId).emit("connection-request", {
      from: socket.id,
      peer,
    });

    ack({ success: true });
  });

  // connection accepept request
  socket.on("accept-connection", ({ targetSocketId }, ack) => {
    const roomId = socket.data.currentRoom;

    if (!isRoomPeer(roomId, socket.id, targetSocketId)) {
      return ack({
        success: false,
        message: "Peer not found",
      });
    }

    io.to(targetSocketId).emit("connection-accepted", {
      from: socket.id,
    });

    ack({ success: true });
  });

  // connection rejected
  socket.on("reject-connection", ({ targetSocketId }) => {
    const roomId = socket.data.currentRoom;

    if (!isRoomPeer(roomId, socket.id, targetSocketId)) return;

    io.to(targetSocketId).emit("connection-rejected", {
      from: socket.id,
    });
  });

  //webrtc-offer
  socket.on("webrtc-offer", ({ targetSocketId, offer }) => {
    const roomId = socket.data.currentRoom;

    if (!isRoomPeer(roomId, socket.id, targetSocketId)) return;

    io.to(targetSocketId).emit("webrtc-offer", {
      from: socket.id,
      offer,
    });
  });

  //webrtc-answer
  socket.on("webrtc-answer", ({ targetSocketId, answer }) => {
    const roomId = socket.data.currentRoom;

    if (!isRoomPeer(roomId, socket.id, targetSocketId)) return;

    io.to(targetSocketId).emit("webrtc-answer", {
      from: socket.id,
      answer,
    });
  });

  //ice-candidate
  socket.on("ice-candidate", ({ targetSocketId, candidate }) => {
    const roomId = socket.data.currentRoom;

    if (!isRoomPeer(roomId, socket.id, targetSocketId)) return;

    io.to(targetSocketId).emit("ice-candidate", {
      from: socket.id,
      candidate,
    });
  });

  //leave the room -> common function for both
  function leaveRoom() {
    const roomId = socket.data.currentRoom;

    if (!roomId) return;

    removePeer(roomId, socket.id);

    socket.leave(roomId);

    socket.data.currentRoom = null;

    socket.to(roomId).emit("peer-disconnected", {
      socketId: socket.id,
    });

    const peers = getPeers(roomId);

    if (peers.length > 0) {
      io.to(roomId).emit("room-updated", {
        roomId,
        peers,
      });
    }
  }

  socket.on("leave-room", leaveRoom);

  socket.on("disconnect", leaveRoom);
}
