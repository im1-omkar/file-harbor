import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Cloud, ArrowRight, Zap, ServerOff, MonitorSmartphone, Lock } from "lucide-react";
import { motion } from "framer-motion";

import { AuthModal } from "../components/AuthModal";
import { ConnectionRequest } from "../components/ConnectionRequest";
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
    <div className="relative min-h-screen bg-[#050505] text-zinc-50 font-sans selection:bg-zinc-700 selection:text-white overflow-x-hidden">
      
      {/* Subtle sharp grid background (adds texture, minimal, no AI slop) */}
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:24px_24px] opacity-20"></div>

      {/* Functional overlays — untouched logic */}
      <StatusPanel
        status={signaling.status}
        socketId={signaling.socketId}
        currentRoom={signaling.currentRoom}
      />
      <ConnectionRequest
        request={signaling.incomingRequest}
        onAccept={signaling.acceptConnection}
        onReject={signaling.rejectConnection}
      />
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={(u) => {
          onAuthSuccess(u);
          navigate("/dashboard");
        }}
        initialMode={authMode}
      />

      {/* ─── Header ─── */}
      <header className="sticky top-0 z-40 bg-[#050505]/80 backdrop-blur-md border-b border-white/[0.08]">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2">
              <LogoMark size={20} className="text-white" />
              <span className="text-sm font-semibold tracking-tight text-white">
                File Harbor
              </span>
            </Link>
            <nav className="hidden md:flex items-center gap-6">
              <button onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })} className="text-sm text-zinc-400 hover:text-white transition-colors cursor-pointer">
                How it works
              </button>
              <button onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })} className="text-sm text-zinc-400 hover:text-white transition-colors cursor-pointer">
                Features
              </button>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <P2PConnection
              connected={webRTC.connected}
              onDisconnect={webRTC.closePeerConnection}
            />
            {user ? (
              <Link
                to="/dashboard"
                className="bg-white text-black text-xs font-medium px-4 py-2 rounded-md hover:bg-zinc-200 transition-colors flex items-center gap-1.5"
              >
                Dashboard <ArrowRight size={14} />
              </Link>
            ) : (
              <div className="flex items-center gap-4">
                <button
                  onClick={() => openAuth("signin")}
                  className="text-sm font-medium text-zinc-400 hover:text-white transition-colors cursor-pointer"
                >
                  Log in
                </button>
                <button
                  onClick={() => openAuth("signup")}
                  className="bg-white text-black text-sm font-medium px-4 py-2 rounded-md hover:bg-zinc-200 transition-colors cursor-pointer"
                >
                  Sign Up
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="relative z-10">
        {/* ─── Hero: Tagline + Transfer Widget ─── */}
        <section className="max-w-6xl mx-auto px-6 pt-16 pb-8">
          {/* Short punchy copy */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12 max-w-2xl mx-auto"
          >
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-[1.1] mb-5 drop-shadow-sm">
              Send files between<br />devices. Directly.
            </h1>
            <p className="text-base sm:text-lg text-zinc-400 leading-relaxed max-w-xl mx-auto">
              No cloud uploads, no size limits. File Harbor connects browsers peer-to-peer
              over encrypted WebRTC and streams your files at full speed.
            </p>
          </motion.div>

          {/* ─── The Transfer Widget — dominant, centered, big ─── */}
          <motion.div
            id="transfer-widget"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="w-full max-w-4xl mx-auto"
          >
            <div className="bg-[#0a0a0a]/90 backdrop-blur-sm border border-white/[0.1] rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/[0.05]">
              {/* Window chrome */}
              <div className="flex items-center gap-2 px-5 py-4 border-b border-white/[0.08] bg-[#0f0f0f]">
                <div className="w-3 h-3 rounded-full bg-zinc-700/80" />
                <div className="w-3 h-3 rounded-full bg-zinc-700/80" />
                <div className="w-3 h-3 rounded-full bg-zinc-700/80" />
                <span className="ml-3 text-xs font-mono text-zinc-500">file-harbor — terminal</span>
              </div>

              {/* Widget body — generous padding */}
              <div className="p-6 sm:p-10 lg:p-12 space-y-10">
                {/* Peer radar */}
                <PeerList
                  peers={signaling.peers}
                  currentRoom={signaling.currentRoom}
                  userName={name}
                  userDevice={userDevice}
                  onConnect={signaling.requestConnection}
                />

                <div className="h-px bg-white/[0.08] w-full max-w-2xl mx-auto" />

                {/* Room controls */}
                <div className="max-w-2xl mx-auto">
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

                <div className="h-px bg-white/[0.08] w-full max-w-2xl mx-auto" />

                {/* File send */}
                <div className="max-w-2xl mx-auto">
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
          </motion.div>

          {/* Trust signals — small, underneath the widget */}
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 mt-10 text-sm text-zinc-400 font-mono">
            <span className="flex items-center gap-2 bg-white/[0.03] px-3 py-1 rounded-full border border-white/[0.05]"><Lock size={14} /> E2E encrypted</span>
            <span className="flex items-center gap-2 bg-white/[0.03] px-3 py-1 rounded-full border border-white/[0.05]"><Zap size={14} /> No size limits</span>
            <span className="flex items-center gap-2 bg-white/[0.03] px-3 py-1 rounded-full border border-white/[0.05]"><ServerOff size={14} /> Zero storage</span>
          </div>

          {!user && (
            <div className="flex justify-center mt-8">
              <button
                onClick={() => openAuth("signup")}
                className="text-sm font-medium text-zinc-300 hover:text-white border border-zinc-700 hover:border-zinc-500 bg-[#0a0a0a] hover:bg-[#111] px-5 py-2.5 rounded-lg transition-colors cursor-pointer flex items-center gap-2 shadow-sm"
              >
                <Cloud size={16} /> Sign up for 5 GB cloud backup
              </button>
            </div>
          )}
        </section>

        {/* ─── How it works ─── */}
        <section id="how-it-works" className="border-t border-white/[0.08] mt-20">
          <div className="max-w-6xl mx-auto px-6 py-28">
            <h2 className="text-3xl font-bold tracking-tight text-white mb-3">How it works</h2>
            <p className="text-base text-zinc-400 mb-16 max-w-md">Four steps. No accounts required for P2P transfer.</p>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { n: "01", title: "Create or Join", desc: "Enter a room ID to connect with your peer's session." },
                { n: "02", title: "Connect", desc: "Accept the secure P2P connection request from the other device." },
                { n: "03", title: "Pick a file", desc: "Choose any file — no size limits, no compression applied." },
                { n: "04", title: "Transfer", desc: "Files stream directly over WebRTC. Instant and private." },
              ].map((step) => (
                <motion.div
                  key={step.n}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4 }}
                  className="bg-[#0a0a0a] p-8 rounded-xl border border-white/[0.05] hover:border-white/[0.15] transition-colors shadow-sm"
                >
                  <span className="text-sm font-mono text-zinc-500 mb-5 block bg-white/[0.04] w-fit px-2 py-0.5 rounded-md">{step.n}</span>
                  <h3 className="text-base font-semibold text-white mb-2.5">{step.title}</h3>
                  <p className="text-sm text-zinc-400 leading-relaxed">{step.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Features ─── */}
        <section id="features" className="border-t border-white/[0.08]">
          <div className="max-w-6xl mx-auto px-6 py-28">
            <h2 className="text-3xl font-bold tracking-tight text-white mb-3">Built for this</h2>
            <p className="text-base text-zinc-400 mb-16 max-w-md">WebRTC peer connections, DTLS encryption, zero server storage.</p>

            <div className="grid md:grid-cols-2 gap-4">
              {[
                { title: "Direct P2P", icon: Zap, desc: "Full native speed. No upload-then-download. Data goes straight from sender to receiver over the local network or internet." },
                { title: "End-to-End Encryption", icon: Lock, desc: "WebRTC DTLS/SCTP channels encrypt every byte in transit. We can't see your files even if we wanted to." },
                { title: "Zero Server Storage", icon: ServerOff, desc: "The signaling server negotiates the handshake, then steps away. Files never touch our infrastructure." },
                { title: "Any Device", icon: MonitorSmartphone, desc: "Works in any modern browser. Desktop to phone, phone to phone, laptop to laptop — just share a room ID." },
              ].map((feat, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4 }}
                  className="bg-[#0a0a0a] p-10 rounded-2xl border border-white/[0.05] hover:border-white/[0.15] transition-colors group shadow-sm"
                >
                  <div className="bg-white/[0.04] w-12 h-12 rounded-xl flex items-center justify-center mb-6 border border-white/[0.05] group-hover:bg-white/[0.08] transition-colors">
                    <feat.icon size={22} className="text-zinc-400 group-hover:text-white transition-colors" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-3">{feat.title}</h3>
                  <p className="text-base text-zinc-400 leading-relaxed">{feat.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── CTA ─── */}
        <section className="border-t border-white/[0.08]">
          <div className="max-w-6xl mx-auto px-6 py-32 text-center">
            <h2 className="text-4xl font-bold tracking-tight text-white mb-5">Ready to transfer?</h2>
            <p className="text-base text-zinc-400 mb-10 max-w-md mx-auto">Scroll up and join a room. It takes five seconds and doesn't require an account.</p>
            <button
              onClick={() => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
                setTimeout(() => {
                  document.getElementById('transfer-widget')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 300);
              }}
              className="bg-white text-black text-base font-semibold px-8 py-3.5 rounded-lg hover:bg-zinc-200 transition-colors inline-flex items-center gap-2 cursor-pointer shadow-lg"
            >
              Start Transfer <ArrowRight size={18} />
            </button>
          </div>
        </section>
      </main>

      {/* ─── Footer ─── */}
      <footer className="border-t border-white/[0.08] bg-black py-10 relative z-10">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5 text-zinc-500">
            <LogoMark size={20} className="text-zinc-500" />
            <span className="text-sm font-semibold">File Harbor</span>
          </div>
          <p className="text-xs text-zinc-600 font-mono text-center">
            Browser-to-browser encrypted WebRTC transfer
          </p>
          <div className="flex items-center gap-5 text-sm text-zinc-500">
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-white transition-colors">Terms</a>
            <a href="https://github.com/file-harbor" className="hover:text-white transition-colors">GitHub</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
