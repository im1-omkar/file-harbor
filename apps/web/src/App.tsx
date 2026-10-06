import { useState } from "react";

import { ConnectionRequest } from "./components/ConnectionRequest";
import { JoinRoom } from "./components/JoinRoom";
import { P2PConnection } from "./components/P2PConnection";
import { PeerList } from "./components/PeerList";
import { SendFile } from "./components/SendFile";
import { StatusPanel } from "./components/StatusPanel";

import { useFileTransfer } from "./hooks/useFileTransfer";
import { useSignaling } from "./hooks/useSignaling";
import { useWebRTC } from "./hooks/useWebRTC";

export default function App() {
    const [roomId, setRoomId] = useState("9999");

    const [name, setName] = useState("Omkar");
  
    const signaling = useSignaling();
 
    const fileTransfer = useFileTransfer({  setStatus: signaling.setStatus, });
 

    const webRTC = useWebRTC({
        
            socketRef:  signaling.socketRef,

            setStatus:  signaling.setStatus,

            onMessage:  fileTransfer.receiveMessage,
        }); 

    return (
        <main
            style={{
                padding: 24,
                fontFamily:
                    "system-ui, -apple-system, sans-serif",
                maxWidth: 680,
                margin: "0 auto",
            }}
        >
            <h2>File Harbor</h2>

            <StatusPanel
                status={signaling.status}
                socketId={signaling.socketId}
                currentRoom={
                    signaling.currentRoom
                }
            />

            <ConnectionRequest
                request={
                    signaling.incomingRequest
                }
                onAccept={
                    signaling.acceptConnection
                }
                onReject={
                    signaling.rejectConnection
                }
            />

            <hr />

            <JoinRoom
                roomId={roomId}
                name={name}
                currentRoom={
                    signaling.currentRoom
                }
                onRoomIdChange={setRoomId}
                onNameChange={setName}
                onJoin={() =>
                    signaling.joinRoom(
                        roomId,
                        name,
                    )
                }
                onLeave={
                    signaling.leaveRoom
                }
            />

            <hr />

            <PeerList
                peers={signaling.peers}
                currentRoom={
                    signaling.currentRoom
                }
                onConnect={
                    signaling.requestConnection
                }
            />

            <hr />

            <P2PConnection
                connected={
                    webRTC.connected
                }
                onDisconnect={
                    webRTC.closePeerConnection
                }
            />

            <hr />

            <SendFile
                file={
                    fileTransfer.selectedFile
                }
                progress={
                    fileTransfer.progress
                }
                connected={
                    webRTC.connected
                }
                onFileSelect={
                    fileTransfer.setSelectedFile
                }
                onSend={() =>
                    fileTransfer.sendFile(
                        webRTC.dcRef.current,
                    )
                }
            />
        </main>
    );
}