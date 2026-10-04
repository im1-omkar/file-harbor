
import { useEffect, useRef, useState } from "react";
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

export default function App() {
  // ---------------- STATE ----------------

  const [roomId, setRoomId] = useState("9999");
  const [name, setName] = useState("Omkar");

  const [socketId, setSocketId] = useState("");
  const [peers, setPeers] = useState<Peer[]>([]);

  const [connected, setConnected] = useState(false);
  const [status, setStatus] = useState("Not connected");

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);

  // ---------------- REFS ----------------

  const socketRef = useRef<Socket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);

  const targetRef = useRef<string | null>(null);

  const pendingCandidates = useRef<RTCIceCandidateInit[]>([]);

  const incomingFile = useRef<IncomingFile | null>(null);
  const receivedChunks = useRef<BlobPart[]>([]);
  const receivedBytes = useRef(0);

  // ---------------- SOCKET CONNECTION ----------------

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
    });

    // Updated room peer list
    socket.on("room-updated", ({ peers }: { peers: Peer[] }) => {
      setPeers(peers.filter(p => p.socketId !== socket.id));
    });

    // Someone wants to connect
    socket.on("connection-request", ({ from, peer }) => {
      const accepted = window.confirm(
        `${peer.name} (${peer.device}) wants to connect. Accept?`
      );

      if (accepted) {
        socket.emit("accept-connection", {
          targetSocketId: from,
        }, (res: any) => {
          if (!res?.success) {
            setStatus(res?.message || "Could not accept connection");
          }
        });
      } else {
        socket.emit("reject-connection", {
          targetSocketId: from,
        });
      }
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
          offer: pc.localDescription,
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

        // Receiver gets the DataChannel created by initiator
        pc.ondatachannel = (event) => {
          setupDataChannel(event.channel);
        };

        await pc.setRemoteDescription(offer);

        // Apply ICE candidates received before the offer
        await flushPendingCandidates(pc);

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.emit("webrtc-answer", {
          targetSocketId: from,
          answer: pc.localDescription,
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
        await pc.setRemoteDescription(answer);
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
        await pc.addIceCandidate(candidate);
      } catch (error) {
        console.error("ICE candidate error:", error);
      }
    });

    // Peer disconnected
    socket.on("peer-disconnected", ({ socketId }) => {
      if (targetRef.current === socketId) {
        closePeerConnection();
        setStatus("Peer disconnected");
      }
    });

    return () => {
      closePeerConnection();
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  // ---------------- JOIN ROOM ----------------

  function joinRoom() {
    const socket = socketRef.current;

    if (!socket?.connected) {
      setStatus("Signaling server is not connected");
      return;
    }

    const device = navigator.userAgent;

    socket.emit(
      "join-room",
      { roomId, name, device },
      (res: any) => {
        if (!res.success) {
          setStatus(res.message);
          return;
        }

        setPeers(res.peers);
        setStatus(`Joined room ${res.roomId}`);
      }
    );
  }

  // ---------------- PEER CONNECTION ----------------

  function createPeerConnection(targetSocketId: string) {
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
  }

  async function flushPendingCandidates(pc: RTCPeerConnection) {
    const candidates = pendingCandidates.current.splice(0);

    for (const candidate of candidates) {
      await pc.addIceCandidate(candidate);
    }
  }

  function closePeerConnection() {
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
  }

  // ---------------- CONNECTION REQUEST ----------------

  function requestConnection(targetSocketId: string) {
    socketRef.current?.emit(
      "request-connection",
      { targetSocketId },
      (res: any) => {
        if (!res.success) {
          setStatus(res.message);
          return;
        }

        setStatus("Connection request sent");
      }
    );
  }

  // ---------------- DATA CHANNEL ----------------

  function setupDataChannel(dc: RTCDataChannel) {
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
  }

  // ---------------- FILE RECEIVING ----------------

  function receiveMessage(data: string | ArrayBuffer) {
    // Metadata and completion messages are JSON strings
    if (typeof data === "string") {
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
        setStatus(`Receiving ${message.name}`);
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

      return;
    }

    // Binary file chunks
    const fileInfo = incomingFile.current;

    if (!fileInfo) return;

    receivedChunks.current.push(data);
    receivedBytes.current += data.byteLength;

    setProgress(
      Math.min(
        100,
        Math.round((receivedBytes.current / fileInfo.size) * 100)
      )
    );
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

      // Handle a drain that happened before listeners were attached
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
      setStatus(`Sending ${file.name}`);

      // Tell receiver about the incoming file
      dc.send(
        JSON.stringify({
          type: "file-start",
          name: file.name,
          size: file.size,
          mimeType: file.type,
        })
      );

      let sentBytes = 0;

      // Read and send one chunk at a time
      while (sentBytes < file.size) {
        await waitForBufferDrain(dc);

        if (dc.readyState !== "open") {
          throw new Error("Connection closed");
        }

        const chunk = file.slice(
          sentBytes,
          sentBytes + CHUNK_SIZE
        );

        const buffer = await chunk.arrayBuffer();

        dc.send(buffer);

        sentBytes += buffer.byteLength;

        setProgress(
          Math.round((sentBytes / file.size) * 100)
        );
      }

      // Tell receiver transfer is complete
      await waitForBufferDrain(dc);

      dc.send(
        JSON.stringify({
          type: "file-end",
        })
      );

      setStatus(`File sent: ${file.name}`);
    } catch (error) {
      console.error(error);
      setStatus(
        error instanceof Error ? error.message : "Transfer failed"
      );
    }
  }

  // ---------------- UI ----------------

  return (
    <main style={{ padding: 24, fontFamily: "sans-serif" }}>
      <h2>File Harbor</h2>

      <p>{status}</p>

      <hr />

      <h3>Join Room</h3>

      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Your name"
      />

      <input
        value={roomId}
        onChange={(e) => setRoomId(e.target.value)}
        placeholder="Room ID"
      />

      <button onClick={joinRoom}>Join Room</button>

      <hr />

      <h3>Peers in Room</h3>

      {peers.length === 0 && <p>No other peers found.</p>}

      {peers.map((peer) => (
        <div key={peer.socketId} style={{ marginBottom: 12 }}>
          <span>
            {peer.name} — {peer.device}
          </span>

          <button
            onClick={() => requestConnection(peer.socketId)}
          >
            Connect
          </button>
        </div>
      ))}

      <hr />

      <h3>P2P Connection</h3>

      <p>
        DataChannel: {connected ? "Connected" : "Not connected"}
      </p>

      <hr />

      <h3>Send File</h3>

      <input
        type="file"
        onChange={(e) =>
          setSelectedFile(e.target.files?.[0] || null)
        }
      />

      {selectedFile && (
        <p>
          {selectedFile.name} (
          {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)
        </p>
      )}

      <button
        onClick={sendFile}
        disabled={!connected || !selectedFile}
      >
        Send File
      </button>

      <p>Transfer progress: {progress}%</p>

      <progress value={progress} max={100} />

    </main>
  );
}
