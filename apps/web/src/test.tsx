import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";

const SERVER_URL =
  import.meta.env.VITE_SIGNALING_SERVER_URL || "http://localhost:3000";

const CHUNK_SIZE = 64 * 1024;
const BUFFER_LIMIT = 1024 * 1024;

interface Peer {
  socketId: string;
  name: string;
  device: string;
}

interface IncomingFile {
  name: string;
  size: number;
  type: string;
}

function getDeviceName(): string {
  if (typeof navigator === "undefined") return "Web Client";
  const ua = navigator.userAgent;
  let browser = "Browser";
  if (ua.includes("Firefox")) browser = "Firefox";
  else if (ua.includes("Edg")) browser = "Edge";
  else if (ua.includes("Chrome")) browser = "Chrome";
  else if (ua.includes("Safari")) browser = "Safari";

  let os = "Device";
  if (ua.includes("Win")) os = "Windows";
  else if (ua.includes("Mac")) os = "macOS";
  else if (ua.includes("Linux")) os = "Linux";
  else if (ua.includes("Android")) os = "Android";
  else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";

  return `${browser} on ${os}`;
}

export default function App() {
  // -------- states ----------------

  const [roomId, setRoomId] = useState("9999");
  const [name, setName] = useState("Omkar");
  const [currentRoom, setCurrentRoom] = useState<string | null>(null);

  const [socketId, setSocketId] = useState("");
  const [peers, setPeers] = useState<Peer[]>([]);

  const [incomingRequest, setIncomingRequest] = useState<{
    from: string;
    peer: Peer;
  } | null>(null);

  const [connected, setConnected] = useState(false);
  const [status, setStatus] = useState("Not connected");

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);

  // --------- refs ----------------

  const socketRef = useRef<Socket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);

  const targetRef = useRef<string | null>(null);
  const pendingCandidates = useRef<RTCIceCandidateInit[]>([]);

  const incomingFile = useRef<IncomingFile | null>(null);
  const receivedChunks = useRef<BlobPart[]>([]);
  const receivedBytes = useRef(0);

  // ---------------- peer connection Helper ----------------

  const closePeerConnection = useCallback(() => {
    dcRef.current?.close();
    pcRef.current?.close();

    dcRef.current = null;
    pcRef.current = null;

    targetRef.current = null;
    pendingCandidates.current = [];
    incomingFile.current = null;
    receivedChunks.current = [];
    receivedBytes.current = 0;

    setConnected(false);
    setProgress(0);
  }, []);

  const flushPendingCandidates = useCallback(async (pc: RTCPeerConnection) => {
    const candidates = pendingCandidates.current.splice(0);

    for (const candidate of candidates) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (error) {
        console.error("Failed to add pending ICE candidate:", error);
      }
    }
  }, []);

  // -------file receiving ----------------

  const receiveMessage = useCallback((data: string | ArrayBuffer) => {
    if (typeof data === "string") {
      try {
        const message = JSON.parse(data);

        if (message.type === "file-start") {
          incomingFile.current = {
            name: message.name,
            size: message.size,
            type: message.mimeType,
          };

          receivedChunks.current = [];
          receivedBytes.current = 0;

          setProgress(0);
          setStatus(`Receiving ${message.name}...`);
        }

        if (message.type === "file-end") {
          const fileInfo = incomingFile.current;
          if (!fileInfo) return;

          if (receivedBytes.current !== fileInfo.size) {
            setStatus("File size mismatch. Transfer incomplete.");
            return;
          }

          const blob = new Blob(receivedChunks.current, {
            type: fileInfo.type || "application/octet-stream",
          });

          const url = URL.createObjectURL(blob);
          const anchor = document.createElement("a");

          anchor.href = url;
          anchor.download = fileInfo.name;
          anchor.click();

          setTimeout(() => URL.revokeObjectURL(url), 60_000);

          setStatus(`Received ${fileInfo.name} successfully!`);

          incomingFile.current = null;
          receivedChunks.current = [];
          receivedBytes.current = 0;
          setProgress(100);
        }
      } catch (err) {
        console.error("Failed to parse data channel message:", err);
      }
      return;
    }

    // Binary file chunks
    const fileInfo = incomingFile.current;
    if (!fileInfo) return;

    receivedChunks.current.push(data);
    receivedBytes.current += data.byteLength;

    setProgress(
      Math.min(100, Math.round((receivedBytes.current / fileInfo.size) * 100)),
    );
  }, []);

  // --------data channels ----------------

  const setupDataChannel = useCallback(
    (dc: RTCDataChannel) => {
      dcRef.current = dc;

      dc.binaryType = "arraybuffer";
      dc.bufferedAmountLowThreshold = BUFFER_LIMIT / 2;

      dc.onopen = () => {
        setConnected(true);
        setStatus("DataChannel open. Ready to transfer files!");
      };

      dc.onclose = () => {
        setConnected(false);
        setStatus("DataChannel closed");
      };

      dc.onerror = (error) => {
        console.error("DataChannel error:", error);
        setStatus("DataChannel error");
      };

      dc.onmessage = (event) => {
        receiveMessage(event.data);
      };
    },
    [receiveMessage],
  );

  const createPeerConnection = useCallback(
    (targetSocketId: string) => {
      closePeerConnection();

      pendingCandidates.current = [];

      const pc = new RTCPeerConnection({
        iceServers: [
          {
            urls: "stun:stun.l.google.com:19302",
          },
        ],
      });

      pcRef.current = pc;

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socketRef.current?.emit("ice-candidate", {
            targetSocketId,
            candidate: event.candidate.toJSON(),
          });
        }
      };

      pc.onconnectionstatechange = () => {
        console.log("WebRTC state:", pc.connectionState);

        if (pc.connectionState === "connected") {
          setStatus("P2P connection established!");
        }

        if (
          pc.connectionState === "failed" ||
          pc.connectionState === "disconnected" ||
          pc.connectionState === "closed"
        ) {
          setConnected(false);
        }
      };

      return pc;
    },
    [closePeerConnection],
  );

  // -------socket connection ----------------

  useEffect(() => {
    const socket = io(SERVER_URL);
    socketRef.current = socket;

    socket.on("connect", () => {
      setSocketId(socket.id ?? "");
      setStatus("Connected to signaling server");
    });

    socket.on("disconnect", () => {
      setStatus("Signaling server disconnected");
      setPeers([]);
      setCurrentRoom(null);
      setIncomingRequest(null);
    });

    // Updated room peer list
    socket.on("room-updated", ({ peers: updatedPeers }: { peers: Peer[] }) => {
      setPeers(updatedPeers.filter((p) => p.socketId !== socket.id));
    });

    // Someone wants to connect
    socket.on("connection-request", ({ from, peer }) => {
      setIncomingRequest({ from, peer });
      setStatus(`Incoming connection request from ${peer.name}`);
    });

    // Request was rejected
    socket.on("connection-rejected", () => {
      setStatus("Connection request was rejected by peer");
    });

    // We are the initiator: create offer
    socket.on("connection-accepted", async ({ from }) => {
      targetRef.current = from;

      try {
        const pc = createPeerConnection(from);

        // Initiator creates the DataChannel
        const dc = pc.createDataChannel("file-transfer");
        setupDataChannel(dc);

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        socket.emit("webrtc-offer", {
          targetSocketId: from,
          offer: {
            type: pc.localDescription!.type,
            sdp: pc.localDescription!.sdp,
          },
        });

        setStatus("Offer sent. Waiting for answer...");
      } catch (error) {
        console.error(error);
        setStatus("Failed to create offer");
      }
    });

    // We are the receiver: process offer and send answer
    socket.on("webrtc-offer", async ({ from, offer }) => {
      targetRef.current = from;

      try {
        const queuedCandidates = pendingCandidates.current;
        const pc = createPeerConnection(from);
        pendingCandidates.current = queuedCandidates;

        pc.ondatachannel = (event) => {
          setupDataChannel(event.channel);
        };

        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        await flushPendingCandidates(pc);

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.emit("webrtc-answer", {
          targetSocketId: from,
          answer: {
            type: pc.localDescription!.type,
            sdp: pc.localDescription!.sdp,
          },
        });

        setStatus("Answer sent. Establishing P2P connection...");
      } catch (error) {
        console.error(error);
        setStatus("Failed to process offer");
      }
    });

    // Initiator receives answer
    socket.on("webrtc-answer", async ({ answer }) => {
      const pc = pcRef.current;
      if (!pc || pc.signalingState !== "have-local-offer") return;

      try {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
        await flushPendingCandidates(pc);
      } catch (error) {
        console.error(error);
        setStatus("Failed to process answer");
      }
    });

    // Receive ICE candidates
    socket.on("ice-candidate", async ({ candidate }) => {
      const pc = pcRef.current;

      if (!pc || !pc.remoteDescription) {
        pendingCandidates.current.push(candidate);
        return;
      }

      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (error) {
        console.error("ICE candidate error:", error);
      }
    });

    // Peer disconnected
    socket.on("peer-disconnected", ({ socketId: disconnectedId }) => {
      if (targetRef.current === disconnectedId) {
        closePeerConnection();
        setStatus("Peer disconnected");
      }
      setPeers((prev) => prev.filter((p) => p.socketId !== disconnectedId));
      setIncomingRequest((prev) =>
        prev?.from === disconnectedId ? null : prev,
      );
    });

    return () => {
      closePeerConnection();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [
    createPeerConnection,
    setupDataChannel,
    flushPendingCandidates,
    closePeerConnection,
  ]);

  // -----user's actions ----------------

  function joinRoom() {
    const socket = socketRef.current;

    if (!socket?.connected) {
      setStatus("Signaling server is not connected");
      return;
    }

    const device = getDeviceName();

    socket.emit(
      "join-room",
      { roomId, name, device },
      (res: {
        success: boolean;
        message?: string;
        roomId?: string;
        peers?: Peer[];
      }) => {
        if (!res.success) {
          setStatus(res.message || "Failed to join room");
          return;
        }

        setPeers(res.peers || []);
        setCurrentRoom(res.roomId || roomId);
        setStatus(`Joined room ${res.roomId || roomId}`);
      },
    );
  }

  function leaveRoom() {
    const socket = socketRef.current;
    if (!socket) return;

    socket.emit("leave-room");
    closePeerConnection();
    setCurrentRoom(null);
    setPeers([]);
    setIncomingRequest(null);
    setStatus("Left room");
  }

  function requestConnection(targetSocketId: string) {
    socketRef.current?.emit(
      "request-connection",
      { targetSocketId },
      (res: { success: boolean; message?: string }) => {
        if (!res.success) {
          setStatus(res.message || "Failed to request connection");
          return;
        }

        setStatus("Connection request sent. Waiting for peer response...");
      },
    );
  }

  function acceptConnection() {
    if (!incomingRequest || !socketRef.current) return;
    const { from } = incomingRequest;
    setIncomingRequest(null);

    socketRef.current.emit(
      "accept-connection",
      { targetSocketId: from },
      (res: { success: boolean; message?: string }) => {
        if (!res?.success) {
          setStatus(res?.message || "Could not accept connection");
        } else {
          setStatus("Connection accepted. Waiting for WebRTC offer...");
        }
      },
    );
  }

  function rejectConnection() {
    if (!incomingRequest || !socketRef.current) return;
    const { from } = incomingRequest;
    setIncomingRequest(null);

    socketRef.current.emit("reject-connection", {
      targetSocketId: from,
    });
    setStatus("Connection request rejected");
  }

  // ---------------- FILE SENDING ----------------

  function waitForBufferDrain(dc: RTCDataChannel): Promise<void> {
    if (dc.readyState !== "open") {
      return Promise.reject(new Error("DataChannel is not open"));
    }

    if (dc.bufferedAmount <= BUFFER_LIMIT) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const cleanup = () => {
        dc.removeEventListener("bufferedamountlow", onLow);
        dc.removeEventListener("close", onClose);
        dc.removeEventListener("error", onError);
      };

      const onLow = () => {
        cleanup();
        resolve();
      };

      const onClose = () => {
        cleanup();
        reject(new Error("DataChannel closed during transfer"));
      };

      const onError = () => {
        cleanup();
        reject(new Error("DataChannel error during transfer"));
      };

      dc.addEventListener("bufferedamountlow", onLow);
      dc.addEventListener("close", onClose);
      dc.addEventListener("error", onError);

      if (dc.bufferedAmount <= BUFFER_LIMIT) {
        onLow();
      }
    });
  }

  async function sendFile() {
    const dc = dcRef.current;

    if (!selectedFile || !dc || dc.readyState !== "open") {
      setStatus("No active P2P connection or file selected");
      return;
    }

    try {
      const file = selectedFile;

      setProgress(0);
      setStatus(`Sending ${file.name}...`);

      dc.send(
        JSON.stringify({
          type: "file-start",
          name: file.name,
          size: file.size,
          mimeType: file.type,
        }),
      );

      let sentBytes = 0;

      while (sentBytes < file.size) {
        await waitForBufferDrain(dc);

        if (dc.readyState !== "open") {
          throw new Error("Connection closed during transfer");
        }

        const chunk = file.slice(sentBytes, sentBytes + CHUNK_SIZE);
        const buffer = await chunk.arrayBuffer();

        dc.send(buffer);
        sentBytes += buffer.byteLength;

        setProgress(Math.round((sentBytes / file.size) * 100));
      }

      await waitForBufferDrain(dc);

      dc.send(
        JSON.stringify({
          type: "file-end",
        }),
      );

      setStatus(`File sent: ${file.name}`);
    } catch (error) {
      console.error(error);
      setStatus(error instanceof Error ? error.message : "Transfer failed");
    }
  }

  // the actuall UI code

  return (
    <main
      style={{
        padding: 24,
        fontFamily: "system-ui, -apple-system, sans-serif",
        maxWidth: 680,
        margin: "0 auto",
      }}
    >
      <h2>File Harbor</h2>

      <div
        style={{
          background: "#f3f4f6",
          padding: "12px 16px",
          borderRadius: 8,
          marginBottom: 16,
        }}
      >
        <p style={{ margin: "4px 0" }}>
          <strong>Status:</strong> {status}
        </p>
        <p style={{ margin: "4px 0", fontSize: 13, color: "#666" }}>
          <strong>Your Socket ID:</strong> {socketId || "Connecting..."}
        </p>
        {currentRoom && (
          <p style={{ margin: "4px 0", fontSize: 13, color: "#166534" }}>
            <strong>Active Room:</strong> {currentRoom}
          </p>
        )}
      </div>

      {incomingRequest && (
        <div
          style={{
            background: "#eff6ff",
            border: "1px solid #bfdbfe",
            padding: 16,
            borderRadius: 8,
            marginBottom: 16,
          }}
        >
          <p style={{ margin: "0 0 10px 0" }}>
            <strong>{incomingRequest.peer.name}</strong> (
            {incomingRequest.peer.device}) wants to connect.
          </p>
          <button
            onClick={acceptConnection}
            style={{
              background: "#2563eb",
              color: "#fff",
              border: "none",
              padding: "6px 14px",
              borderRadius: 4,
              cursor: "pointer",
              marginRight: 8,
            }}
          >
            Accept
          </button>
          <button
            onClick={rejectConnection}
            style={{
              background: "#dc2626",
              color: "#fff",
              border: "none",
              padding: "6px 14px",
              borderRadius: 4,
              cursor: "pointer",
            }}
          >
            Reject
          </button>
        </div>
      )}

      <hr />

      <h3>Join Room</h3>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          style={{
            padding: "6px 10px",
            borderRadius: 4,
            border: "1px solid #ccc",
          }}
        />

        <input
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
          placeholder="Room ID"
          style={{
            padding: "6px 10px",
            borderRadius: 4,
            border: "1px solid #ccc",
          }}
        />

        <button
          onClick={joinRoom}
          disabled={Boolean(currentRoom)}
          style={{
            padding: "6px 14px",
            borderRadius: 4,
            cursor: currentRoom ? "not-allowed" : "pointer",
          }}
        >
          Join Room
        </button>

        {currentRoom && (
          <button
            onClick={leaveRoom}
            style={{
              padding: "6px 14px",
              borderRadius: 4,
              cursor: "pointer",
              background: "#f87171",
              color: "#fff",
              border: "none",
            }}
          >
            Leave Room
          </button>
        )}
      </div>

      <hr />

      <h3>Peers in Room</h3>

      {peers.length === 0 && (
        <p style={{ color: "#777" }}>
          {currentRoom
            ? "No other peers in this room."
            : "Join a room to see peers."}
        </p>
      )}

      {peers.map((peer) => (
        <div
          key={peer.socketId}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "8px 12px",
            background: "#fafafa",
            border: "1px solid #eee",
            borderRadius: 6,
            marginBottom: 8,
          }}
        >
          <span>
            <strong>{peer.name}</strong> — {peer.device}
          </span>

          <button
            onClick={() => requestConnection(peer.socketId)}
            style={{
              padding: "4px 12px",
              borderRadius: 4,
              cursor: "pointer",
            }}
          >
            Connect
          </button>
        </div>
      ))}

      <hr />

      <h3>P2P Connection</h3>

      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <p style={{ margin: 0 }}>
          DataChannel:{" "}
          <strong style={{ color: connected ? "#16a34a" : "#dc2626" }}>
            {connected ? "Connected" : "Not connected"}
          </strong>
        </p>
        {connected && (
          <button
            onClick={closePeerConnection}
            style={{
              padding: "4px 10px",
              borderRadius: 4,
              cursor: "pointer",
              fontSize: 12,
            }}
          >
            Disconnect P2P
          </button>
        )}
      </div>

      <hr />

      <h3>Send File</h3>

      <div style={{ marginBottom: 12 }}>
        <input
          type="file"
          onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
        />
      </div>

      {selectedFile && (
        <p style={{ margin: "8px 0" }}>
          Selected: <strong>{selectedFile.name}</strong> (
          {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)
        </p>
      )}

      <button
        onClick={sendFile}
        disabled={!connected || !selectedFile}
        style={{
          padding: "8px 16px",
          background: connected && selectedFile ? "#16a34a" : "#ccc",
          color: "#fff",
          border: "none",
          borderRadius: 4,
          cursor: connected && selectedFile ? "pointer" : "not-allowed",
          fontWeight: 600,
        }}
      >
        Send File
      </button>

      <div style={{ marginTop: 16 }}>
        <p style={{ margin: "4px 0" }}>Transfer progress: {progress}%</p>
        <progress
          value={progress}
          max={100}
          style={{ width: "100%", height: 16 }}
        />
      </div>
    </main>
  );
}
