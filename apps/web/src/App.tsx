import { useState } from "react";
import { Shield, Zap } from "lucide-react";

import { ConnectionRequest } from "./components/ConnectionRequest";
import { JoinRoom } from "./components/JoinRoom";
import { P2PConnection } from "./components/P2PConnection";
import { PeerList } from "./components/PeerList";
import { SendFile } from "./components/SendFile";
import { StatusPanel } from "./components/StatusPanel";

import { useFileTransfer } from "./hooks/useFileTransfer";
import { useSignaling } from "./hooks/useSignaling";
import { useWebRTC } from "./hooks/useWebRTC";
import { getDeviceName } from "./utils/device";

export default function App() {
  const [roomId, setRoomId] = useState("9999");
  const [name, setName] = useState("Omkar");
  const userDevice = getDeviceName();

  const signaling = useSignaling();

  const fileTransfer = useFileTransfer({
    setStatus: signaling.setStatus,
  });

  const webRTC = useWebRTC({
    socketRef: signaling.socketRef,
    setStatus: signaling.setStatus,
    onMessage: fileTransfer.receiveMessage,
  });

  return (
    <div className="relative min-h-screen bg-dark-950 text-white font-sans overflow-x-hidden lightning-bg selection:bg-white selection:text-black">
      {/* Top Left Status & Connection Info */}
      <StatusPanel
        status={signaling.status}
        socketId={signaling.socketId}
        currentRoom={signaling.currentRoom}
      />

      {/* Connection Request Floating Banner */}
      <ConnectionRequest
        request={signaling.incomingRequest}
        onAccept={signaling.acceptConnection}
        onReject={signaling.rejectConnection}
      />

      {/* Main Container */}
      <div className="relative z-10 max-w-4xl mx-auto px-4 py-8 min-h-screen flex flex-col justify-between">
        {/* Header Branding */}
        <header className="flex items-center justify-between pt-2 pb-6">
          <div className="w-24" /> {/* Spacer to balance left status panel */}

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shadow-[0_0_15px_rgba(255,255,255,0.1)]">
              <Zap size={16} className="text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-white/90 to-white/60 bg-clip-text text-transparent">
              File Harbor
            </h1>
          </div>

          <div className="flex items-center gap-2 text-xs text-white/40">
            <P2PConnection
              connected={webRTC.connected}
              onDisconnect={webRTC.closePeerConnection}
            />
            {!webRTC.connected && (
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.06]">
                <Shield size={12} className="text-white/40" />
                <span>P2P Encrypted</span>
              </div>
            )}
          </div>
        </header>

        {/* Center Core Area: Device Radar Hub & Orbiting Peers */}
        <main className="my-auto py-6 space-y-10">
          {/* Radar & Orbiting Peers Component */}
          <section className="relative">
            <PeerList
              peers={signaling.peers}
              currentRoom={signaling.currentRoom}
              userName={name}
              userDevice={userDevice}
              onConnect={signaling.requestConnection}
            />
          </section>

          {/* Central Actions Grid: Join Room & Send File */}
          <div className="max-w-md mx-auto space-y-4 pt-4">
            {/* Join / Leave Room Panel */}
            <div className="bg-dark-900/60 border border-white/[0.08] rounded-2xl p-5 backdrop-blur-xl shadow-2xl">
              <JoinRoom
                roomId={roomId}
                name={name}
                currentRoom={signaling.currentRoom}
                onRoomIdChange={setRoomId}
                onNameChange={setName}
                onJoin={() => signaling.joinRoom(roomId, name)}
                onLeave={signaling.leaveRoom}
              />
            </div>

            {/* Send File Drag & Drop Panel */}
            <div className="bg-dark-900/60 border border-white/[0.08] rounded-2xl p-5 backdrop-blur-xl shadow-2xl">
              <SendFile
                file={fileTransfer.selectedFile}
                progress={fileTransfer.progress}
                connected={webRTC.connected}
                onFileSelect={fileTransfer.setSelectedFile}
                onSend={() => fileTransfer.sendFile(webRTC.dcRef.current)}
              />
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="py-4 text-center text-xs text-white/20">
          Direct P2P WebRTC Transfer • Zero Server Storage
        </footer>
      </div>
    </div>
  );
}
