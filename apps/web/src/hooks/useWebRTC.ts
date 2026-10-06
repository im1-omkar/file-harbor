import {
    useCallback,
    useEffect,
    useRef,
    useState,
} from "react";

import type { Socket } from "socket.io-client";

import {
    BUFFER_LIMIT,
    ICE_SERVERS,
} from "../config/constants";

import type {
    IceCandidatePayload,
    WebRTCAnswerPayload,
    WebRTCOfferPayload,
} from "../types/signaling";

interface UseWebRTCOptions {
    socketRef: React.MutableRefObject<
        Socket | null
    >;

    setStatus: (status: string) => void;

    onMessage: (
        data: string | ArrayBuffer,
    ) => void;
}

export function useWebRTC({
    socketRef,
    setStatus,
    onMessage,
}: UseWebRTCOptions) {
    const pcRef = useRef<RTCPeerConnection | null>(  null,  );

    const dcRef = useRef<RTCDataChannel | null>(null);

    const targetRef = useRef<string | null>(null);

    const pendingCandidates = useRef<RTCIceCandidateInit[]>([]);

    const [connected, setConnected] = useState(false);

   
    const onMessageRef = useRef(onMessage);

    useEffect(() => {
        onMessageRef.current = onMessage;
    }, [onMessage]);

  
    const setStatusRef =  useRef(setStatus);

    useEffect(() => { 
        setStatusRef.current = setStatus; 
    },  [setStatus]);

   
    const closePeerConnection = useCallback(() => {
            dcRef.current?.close();

            pcRef.current?.close();

            dcRef.current = null;
            pcRef.current = null;

            targetRef.current = null;

            pendingCandidates.current = [];

            setConnected(false);
        }, []);

   
    const flushPendingCandidates =
        useCallback(
            async (
                pc: RTCPeerConnection,
            ) => {
                const candidates =
                    pendingCandidates.current.splice(
                        0,
                    );

                for (const candidate of candidates) {
                    try {
                        await pc.addIceCandidate(
                            new RTCIceCandidate(
                                candidate,
                            ),
                        );
                    } catch (error) {
                        console.error(
                            "Failed to add pending ICE candidate:",
                            error,
                        );
                    }
                }
            },
            [],
        );

  
    const setupDataChannel = useCallback(
            (dc: RTCDataChannel) => {
                dcRef.current = dc;

                dc.binaryType = "arraybuffer";

                dc.bufferedAmountLowThreshold =  BUFFER_LIMIT / 2;

                // -------------------------
                // Open
                // -------------------------

                dc.onopen = () => {
                    setConnected(true);

                    setStatusRef.current(
                        "DataChannel open. Ready to transfer files!",
                    );
                };

                // -------------------------
                // Close
                // -------------------------

                dc.onclose = () => {
                    setConnected(false);

                    setStatusRef.current(
                        "DataChannel closed",
                    );
                };

                // -------------------------
                // Error
                // -------------------------

                dc.onerror = (error) => {
                    console.error(
                        "DataChannel error:",
                        error,
                    );

                    setStatusRef.current(
                        "DataChannel error",
                    );
                };

                // -------------------------
                // Message
                // -------------------------

                dc.onmessage = (event) => {
                    onMessageRef.current(
                        event.data,
                    );
                };
            },
            [],
        );

    
    const createPeerConnection =
        useCallback(
            (
                targetSocketId: string,
                preservePendingCandidates = false,
            ) => {
                /*
                 * Save candidates if we're creating
                 * a new PC while handling an incoming
                 * offer.
                 */
                const queuedCandidates = preservePendingCandidates ? pendingCandidates.current : [];

                closePeerConnection();

                pendingCandidates.current = queuedCandidates;

                const pc = new RTCPeerConnection( ICE_SERVERS, );

                pcRef.current = pc;

                targetRef.current = targetSocketId;

                /*
                 * Local ICE candidate generated.
                 */
                pc.onicecandidate = (event) => {
                    if (!event.candidate) {
                        return;
                    }

                    socketRef.current?.emit(
                        "ice-candidate",
                        {
                            targetSocketId,
                            candidate:
                                event.candidate.toJSON(),
                        },
                    );
                };

                /*
                 * Monitor WebRTC connection.
                 */
                pc.onconnectionstatechange = () => {
                        console.log(
                            "WebRTC state:",
                            pc.connectionState,
                        );

                        if (
                            pc.connectionState ===
                            "connected"
                        ) {
                            setStatusRef.current(
                                "P2P connection established!",
                            );
                        }

                        if (
                            pc.connectionState ===
                            "failed" ||
                            pc.connectionState ===
                            "disconnected" ||
                            pc.connectionState ===
                            "closed"
                        ) {
                            setConnected(false);
                        }
                    };

                return pc;
            },
            [
                closePeerConnection,
                socketRef,
            ],
        );

    
    useEffect(() => {
        const socket =  socketRef.current;

        if (!socket) {
            return;
        }
 
        const handleConnectionAccepted = async ({  from, }: { from: string; }) => {
                targetRef.current = from;

                try {
                    const pc =
                        createPeerConnection(from);

                    /*
                     * Initiator creates DataChannel.
                     */
                    const dc =
                        pc.createDataChannel(
                            "file-transfer",
                        );

                    setupDataChannel(dc);

                    /*
                     * Create offer.
                     */
                    const offer =
                        await pc.createOffer();

                    await pc.setLocalDescription(
                        offer,
                    );

                    socket.emit(
                        "webrtc-offer",
                        {
                            targetSocketId: from,

                            offer: {
                                type:
                                    pc.localDescription!
                                        .type,

                                sdp:
                                    pc.localDescription!
                                        .sdp,
                            },
                        },
                    );

                    setStatusRef.current(
                        "Offer sent. Waiting for answer...",
                    );
                } catch (error) {
                    console.error(error);

                    setStatusRef.current(
                        "Failed to create offer",
                    );
                }
            };

     
        const handleOffer = async ({
            from,
            offer,
        }: WebRTCOfferPayload) => {
            targetRef.current = from;

            try {
                /*
                 * ICE candidates may arrive before
                 * this offer.
                 */
                const pc =
                    createPeerConnection(
                        from,
                        true,
                    );

                /*
                 * Receiver doesn't create the
                 * DataChannel. The initiator does.
                 */
                pc.ondatachannel = (
                    event,
                ) => {
                    setupDataChannel(
                        event.channel,
                    );
                };

                await pc.setRemoteDescription(
                    new RTCSessionDescription(
                        offer,
                    ),
                );

                await flushPendingCandidates(
                    pc,
                );

                /*
                 * Create answer.
                 */
                const answer =
                    await pc.createAnswer();

                await pc.setLocalDescription(
                    answer,
                );

                socket.emit(
                    "webrtc-answer",
                    {
                        targetSocketId: from,

                        answer: {
                            type:
                                pc.localDescription!
                                    .type,

                            sdp:
                                pc.localDescription!
                                    .sdp,
                        },
                    },
                );

                setStatusRef.current(
                    "Answer sent. Establishing P2P connection...",
                );
            } catch (error) {
                console.error(error);

                setStatusRef.current(
                    "Failed to process offer",
                );
            }
        };

 
        const handleAnswer = async ({
            answer,
        }: WebRTCAnswerPayload) => {
            const pc =
                pcRef.current;

            if (
                !pc ||
                pc.signalingState !==
                "have-local-offer"
            ) {
                return;
            }

            try {
                await pc.setRemoteDescription(
                    new RTCSessionDescription(
                        answer,
                    ),
                );

                await flushPendingCandidates(
                    pc,
                );
            } catch (error) {
                console.error(error);

                setStatusRef.current(
                    "Failed to process answer",
                );
            }
        };

         
        const handleIceCandidate =
            async ({
                candidate,
            }: IceCandidatePayload) => {
                const pc =
                    pcRef.current;

                /*
                 * We don't have a remote description
                 * yet, so queue the candidate.
                 */
                if (
                    !pc ||
                    !pc.remoteDescription
                ) {
                    pendingCandidates.current.push(
                        candidate,
                    );

                    return;
                }

                try {
                    await pc.addIceCandidate(
                        new RTCIceCandidate(
                            candidate,
                        ),
                    );
                } catch (error) {
                    console.error(
                        "ICE candidate error:",
                        error,
                    );
                }
            };
 
        const handlePeerDisconnected = ({  socketId: disconnectedId, }: {  socketId: string; }) => {
                if (
                    targetRef.current ===
                    disconnectedId
                ) {
                    closePeerConnection();

                    setStatusRef.current(
                        "Peer disconnected",
                    );
                }
            };

        

        socket.on(
            "connection-accepted",
            handleConnectionAccepted,
        );

        socket.on(
            "webrtc-offer",
            handleOffer,
        );

        socket.on(
            "webrtc-answer",
            handleAnswer,
        );

        socket.on(
            "ice-candidate",
            handleIceCandidate,
        );

        socket.on(
            "peer-disconnected",
            handlePeerDisconnected,
        );
 

        return () => {
            socket.off(
                "connection-accepted",
                handleConnectionAccepted,
            );

            socket.off(
                "webrtc-offer",
                handleOffer,
            );

            socket.off(
                "webrtc-answer",
                handleAnswer,
            );

            socket.off(
                "ice-candidate",
                handleIceCandidate,
            );

            socket.off(
                "peer-disconnected",
                handlePeerDisconnected,
            );

            closePeerConnection();
        };
    }, [
        closePeerConnection,
        createPeerConnection,
        flushPendingCandidates,
        setupDataChannel,
        socketRef,
    ]);

    return {
        pcRef,
        dcRef,

        connected,

        closePeerConnection,
    };
}