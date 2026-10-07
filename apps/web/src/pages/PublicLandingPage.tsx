import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Cloud, ArrowRight } from "lucide-react";

import { AuthModal } from "../components/AuthModal";
import { ConnectionRequest } from "../components/ConnectionRequest";
import { FeaturesPanel } from "../components/FeaturesPanel";
import { JoinRoom } from "../components/JoinRoom";
import { LogoMark } from "../components/LogoMark";
import { P2PConnection } from "../components/P2PConnection";
import { PeerList } from "../components/PeerList";
import { SendFile } from "../components/SendFile";
import { StatusPanel } from "../components/StatusPanel";

import { useFileTransfer } from "../hooks/useFileTransfer";
import { useSignaling } from "../hooks/useSignaling";
import { useWebRTC } from "../hooks/useWebRTC";
import { getDeviceName } from "../utils/device";
import type { UserProfile } from "../services/api";

interface PublicLandingPageProps {
  user: UserProfile | null;
  onAuthSuccess: (user: UserProfile) => void;
}

export function PublicLandingPage({ user, onAuthSuccess }: PublicLandingPageProps) {
  const navigate = useNavigate();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");

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

  function openAuth(mode: "signin" | "signup") {
    setAuthMode(mode);
    setAuthModalOpen(true);
  }

  return (
    <div className="relative min-h-screen bg-black text-fafafa font-sans selection:bg-white selection:text-black">
      {/* Top Left Connection Status Info */}
      <StatusPanel
        status={signaling.status}
        socketId={signaling.socketId}
        currentRoom={signaling.currentRoom}
      />

      {/* Connection Request Floating Prompt Banner */}
      <ConnectionRequest
        request={signaling.incomingRequest}
        onAccept={signaling.acceptConnection}
        onReject={signaling.rejectConnection}
      />

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={(u) => {
          onAuthSuccess(u);
          navigate("/dashboard");
        }}
        initialMode={authMode}
      />

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-6 min-h-screen flex flex-col justify-between">
        {/* Top Navigation Header */}
        <header className="flex items-center justify-between pt-2 pb-6 border-b border-zinc-800">
          <div className="w-28" /> {/* Left spacer for top-left status panel */}

          {/* Vercel-style Brand Title */}
          <div className="flex items-center gap-2.5">
            <LogoMark size={20} className="text-white" />
            <h1 className="text-base font-semibold tracking-tight text-white">
              File Harbor
            </h1>
          </div>

          {/* Right Header Navigation & Auth Controls */}
          <div className="flex items-center gap-3">
            <P2PConnection
              connected={webRTC.connected}
              onDisconnect={webRTC.closePeerConnection}
            />

            {user ? (
              <Link
                to="/dashboard"
                className="bg-white text-black hover:bg-zinc-200 text-xs font-medium px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <span>Dashboard</span>
                <ArrowRight size={12} />
              </Link>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => openAuth("signin")}
                  className="text-xs font-mono text-zinc-400 hover:text-white px-3 py-1.5 transition-colors cursor-pointer"
                >
                  Sign In
                </button>
                <button
                  onClick={() => openAuth("signup")}
                  className="bg-white text-black hover:bg-zinc-200 text-xs font-medium px-3 py-1.5 rounded-md transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <span>Sign Up</span>
                  <Cloud size={12} />
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Cloud Storage Callout Banner */}
        <div className="my-4 bg-zinc-900/90 border border-zinc-800 rounded-lg p-3 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-zinc-800 flex items-center justify-center text-white shrink-0">
              <Cloud size={16} />
            </div>
            <div>
              <p className="text-xs font-semibold text-white">
                Need persistent Cloud Storage?
              </p>
              <p className="text-[11px] font-mono text-zinc-400">
                Sign in to unlock 5 GiB free Supabase direct cloud storage with nested folders.
              </p>
            </div>
          </div>

          {!user && (
            <button
              onClick={() => openAuth("signup")}
              className="bg-white text-black hover:bg-zinc-200 text-xs font-medium px-3.5 py-1.5 rounded transition-colors whitespace-nowrap cursor-pointer shrink-0"
            >
              Claim 5 GB Free
            </button>
          )}
        </div>

        {/* Main Section: Immediate Public P2P Sharing Radar & Controls */}
        <main className="my-auto py-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            {/* Center Area: Central Radar Hub + P2P Controls */}
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

              {/* Action Sections: Join Room & Send File */}
              <div className="max-w-md mx-auto space-y-6 pt-4 border-t border-zinc-800">
                <JoinRoom
                  roomId={roomId}
                  name={name}
                  currentRoom={signaling.currentRoom}
                  onRoomIdChange={setRoomId}
                  onNameChange={setName}
                  onJoin={() => signaling.joinRoom(roomId, name)}
                  onLeave={signaling.leaveRoom}
                />

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

            {/* Right Side: Features Panel */}
            <div className="lg:col-span-5 xl:col-span-4 lg:border-l lg:border-zinc-800 lg:pl-8 pt-2">
              <FeaturesPanel />
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="py-4 border-t border-zinc-800 text-center text-[11px] text-zinc-500 font-mono">
          File Harbor • Direct Browser-to-Browser Encrypted WebRTC Transfer
        </footer>
      </div>
    </div>
  );
}
