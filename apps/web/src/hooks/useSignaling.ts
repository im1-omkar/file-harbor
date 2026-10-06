import {
    useCallback,
    useEffect,
    useRef,
    useState,
} from "react";

import {
    io,
    type Socket,
} from "socket.io-client";

import { SERVER_URL } from "../config/constants";
import { getDeviceName } from "../utils/device";

import type { Peer } from "../types/peer";

import type {
    ActionResponse,
    ConnectionRequest,
    JoinRoomResponse,
    RoomUpdatedPayload,
} from "../types/signaling";

export function useSignaling() {
    const socketRef =
        useRef<Socket | null>(null);

    const [socketId, setSocketId] =
        useState("");

    const [peers, setPeers] =
        useState<Peer[]>([]);

    const [currentRoom, setCurrentRoom] =
        useState<string | null>(null);

    const [incomingRequest, setIncomingRequest] =
        useState<ConnectionRequest | null>(
            null,
        );

    const [status, setStatus] =
        useState("Not connected");

    /*
     * Establish Socket.IO connection.
     */
    useEffect(() => {
        const socket = io(SERVER_URL);

        socketRef.current = socket;

        // -----------------------------
        // Connected
        // -----------------------------

        socket.on("connect", () => {
            setSocketId(socket.id ?? "");

            setStatus(
                "Connected to signaling server",
            );
        });

        // -----------------------------
        // Disconnected
        // -----------------------------

        socket.on("disconnect", () => {
            setStatus(
                "Signaling server disconnected",
            );

            setPeers([]);
            setCurrentRoom(null);
            setIncomingRequest(null);
        });

        // -----------------------------
        // Room updated
        // -----------------------------

        socket.on(
            "room-updated",
            ({
                peers: updatedPeers,
            }: RoomUpdatedPayload) => {
                setPeers(
                    updatedPeers.filter(
                        (peer) =>
                            peer.socketId !== socket.id,
                    ),
                );
            },
        );

        // -----------------------------
        // Incoming connection request
        // -----------------------------

        socket.on(
            "connection-request",
            ({
                from,
                peer,
            }: ConnectionRequest) => {
                setIncomingRequest({
                    from,
                    peer,
                });

                setStatus(
                    `Incoming connection request from ${peer.name}`,
                );
            },
        );

        // -----------------------------
        // Connection rejected
        // -----------------------------

        socket.on(
            "connection-rejected",
            () => {
                setStatus(
                    "Connection request was rejected by peer",
                );
            },
        );

        // -----------------------------
        // Peer disconnected
        // -----------------------------

        socket.on(
            "peer-disconnected",
            ({
                socketId: disconnectedId,
            }: {
                socketId: string;
            }) => {
                setPeers((prev) =>
                    prev.filter(
                        (peer) =>
                            peer.socketId !==
                            disconnectedId,
                    ),
                );

                setIncomingRequest((prev) =>
                    prev?.from === disconnectedId
                        ? null
                        : prev,
                );
            },
        );

        // -----------------------------
        // Cleanup
        // -----------------------------

        return () => {
            socket.removeAllListeners();
            socket.disconnect();

            if (socketRef.current === socket) {
                socketRef.current = null;
            }
        };
    }, []);

    /*
     * Join a signaling room.
     */
    const joinRoom = useCallback(
        (
            roomId: string,
            name: string,
        ) => {
            const socket =
                socketRef.current;

            if (!socket?.connected) {
                setStatus(
                    "Signaling server is not connected",
                );

                return;
            }

            const device = getDeviceName();

            socket.emit(
                "join-room",
                {
                    roomId,
                    name,
                    device,
                },
                (res: JoinRoomResponse) => {
                    if (!res.success) {
                        setStatus(
                            res.message ||
                            "Failed to join room",
                        );

                        return;
                    }

                    setPeers(res.peers || []);

                    setCurrentRoom(
                        res.roomId || roomId,
                    );

                    setStatus(
                        `Joined room ${res.roomId || roomId
                        }`,
                    );
                },
            );
        },
        [],
    );

    /*
     * Leave current room.
     */
    const leaveRoom = useCallback(() => {
        const socket =
            socketRef.current;

        if (!socket) {
            return;
        }

        socket.emit("leave-room");

        setCurrentRoom(null);
        setPeers([]);
        setIncomingRequest(null);

        setStatus("Left room");
    }, []);

    /*
     * Ask another peer for a P2P connection.
     */
    const requestConnection = useCallback(
        (targetSocketId: string) => {
            socketRef.current?.emit(
                "request-connection",
                {
                    targetSocketId,
                },
                (res: ActionResponse) => {
                    if (!res.success) {
                        setStatus(
                            res.message ||
                            "Failed to request connection",
                        );

                        return;
                    }

                    setStatus(
                        "Connection request sent. Waiting for peer response...",
                    );
                },
            );
        },
        [],
    );

    /*
     * Accept incoming connection request.
     */
    const acceptConnection = useCallback(
        () => {
            if (
                !incomingRequest ||
                !socketRef.current
            ) {
                return;
            }

            const { from } =
                incomingRequest;

            setIncomingRequest(null);

            socketRef.current.emit(
                "accept-connection",
                {
                    targetSocketId: from,
                },
                (res: ActionResponse) => {
                    if (!res?.success) {
                        setStatus(
                            res?.message ||
                            "Could not accept connection",
                        );
                    } else {
                        setStatus(
                            "Connection accepted. Waiting for WebRTC offer...",
                        );
                    }
                },
            );
        },
        [incomingRequest],
    );

    /*
     * Reject incoming connection request.
     */
    const rejectConnection = useCallback(
        () => {
            if (
                !incomingRequest ||
                !socketRef.current
            ) {
                return;
            }

            const { from } =
                incomingRequest;

            setIncomingRequest(null);

            socketRef.current.emit(
                "reject-connection",
                {
                    targetSocketId: from,
                },
            );

            setStatus(
                "Connection request rejected",
            );
        },
        [incomingRequest],
    );

    return {
        socketRef,

        socketId,
        peers,
        currentRoom,
        incomingRequest,
        status,

        setStatus,

        joinRoom,
        leaveRoom,
        requestConnection,
        acceptConnection,
        rejectConnection,
    };
}