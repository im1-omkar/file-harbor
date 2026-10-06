import { useState } from "react";

import { ConnectionRequest } from "./components/ConnectionRequest";
import { FeaturesPanel } from "./components/FeaturesPanel";
import { JoinRoom } from "./components/JoinRoom";
import { LogoMark } from "./components/LogoMark";
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
    <div className="relative min-h-screen bg-black text-fafafa font-sans selection:bg-white selection:text-black">
      {/* Top Left Status Info */}
      <StatusPanel
        status={signaling.status}
        socketId={signaling.socketId}
        currentRoom={signaling.currentRoom}
      />

      {/* Connection Request Prompt Banner */}
      <ConnectionRequest
        request={signaling.incomingRequest}
        onAccept={signaling.acceptConnection}
        onReject={signaling.rejectConnection}
      />

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-6 min-h-screen flex flex-col justify-between">
        {/* Top Header */}
        <header className="flex items-center justify-between pt-2 pb-6 border-b border-zinc-800">
          <div className="w-28" /> {/* Left spacer to balance top-left status panel */}

          {/* Vercel-style Brand Title */}
          <div className="flex items-center gap-2.5">
            <LogoMark size={20} className="text-white" />
            <h1 className="text-base font-semibold tracking-tight text-white">
              File Harbor
            </h1>
          </div>

          {/* Right Header Status Pill */}
          <div className="flex items-center gap-2">
            <P2PConnection
              connected={webRTC.connected}
              onDisconnect={webRTC.closePeerConnection}
            />
            {!webRTC.connected && (
              <span className="hidden sm:inline-block text-[11px] font-mono text-zinc-500 border border-zinc-800 rounded px-2 py-0.5">
                P2P Encrypted
              </span>
            )}
          </div>
        </header>

        {/* Main Section Layout */}
        <main className="my-auto py-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            {/* Center Area: Central Radar Hub + Form Actions (7-8 cols on desktop) */}
            <div className="lg:col-span-7 xl:col-span-8 space-y-8">
              {/* Radar Hub */}
              <section className="relative py-2">
                <PeerList
                  peers={signaling.peers}
                  currentRoom={signaling.currentRoom}
                  userName={name}
                  userDevice={userDevice}
                  onConnect={signaling.requestConnection}
                />
              </section>

              {/* Clean Action Sections Separated by Thin Lines (NO heavy cards!) */}
              <div className="max-w-md mx-auto space-y-6 pt-4 border-t border-zinc-800">
                {/* Join Room Section */}
                <JoinRoom
                  roomId={roomId}
                  name={name}
                  currentRoom={signaling.currentRoom}
                  onRoomIdChange={setRoomId}
                  onNameChange={setName}
                  onJoin={() => signaling.joinRoom(roomId, name)}
                  onLeave={signaling.leaveRoom}
                />

                {/* Send File Section */}
                <div className="pt-2 border-t border-zinc-900">
                  <SendFile
                    file={fileTransfer.selectedFile}
                    progress={fileTransfer.progress}
                    connected={webRTC.connected}
                    onFileSelect={fileTransfer.setSelectedFile}
                    onSend={() => fileTransfer.sendFile(webRTC.dcRef.current)}
                  />
                </div>
              </div>
            </div>

            {/* Right Side: Features & Functionality Panel (4-5 cols on desktop) */}
            <div className="lg:col-span-5 xl:col-span-4 lg:border-l lg:border-zinc-800 lg:pl-8 pt-2">
              <FeaturesPanel />
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="py-4 border-t border-zinc-800 text-center text-[11px] text-zinc-500 font-mono">
          File Harbor • Direct Browser-to-Browser WebRTC Data Transfer
        </footer>
      </div>
    </div>
  );
}
