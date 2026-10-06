import type { Peer } from "../types/peer";
import { motion, AnimatePresence } from "framer-motion";
import { Laptop, Smartphone, Monitor } from "lucide-react";

interface Props {
  peers: Peer[];
  currentRoom: string | null;
  userName: string;
  userDevice: string;
  onConnect: (socketId: string) => void;
}

function getDeviceIcon(deviceStr: string) {
  const lower = deviceStr.toLowerCase();
  if (lower.includes("mobile") || lower.includes("android") || lower.includes("ios") || lower.includes("iphone")) {
    return <Smartphone size={18} />;
  }
  if (lower.includes("mac") || lower.includes("laptop")) {
    return <Laptop size={18} />;
  }
  return <Monitor size={18} />;
}

export function PeerList({
  peers,
  currentRoom,
  userName,
  userDevice,
  onConnect,
}: Props) {
  const radius = 145; // Radius of orbit in px

  return (
    <div className="relative w-full aspect-square max-w-[380px] sm:max-w-[420px] mx-auto flex items-center justify-center">
      {/* Background Radar Rings & Pulse */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {/* Outer Ring */}
        <div className="w-[320px] h-[320px] rounded-full border border-white/[0.05] relative flex items-center justify-center">
          {/* Middle Ring */}
          <div className="w-[220px] h-[220px] rounded-full border border-white/[0.07] flex items-center justify-center">
            {/* Inner Ring */}
            <div className="w-[120px] h-[120px] rounded-full border border-white/[0.1]" />
          </div>

          {/* Sweeping Radar Line */}
          {currentRoom && (
            <div
              className="absolute inset-0 rounded-full overflow-hidden"
              style={{ animation: "radar-sweep 8s linear infinite" }}
            >
              <div
                className="w-1/2 h-1/2 absolute top-0 right-0 origin-bottom-left"
                style={{
                  background:
                    "conic-gradient(from 0deg at 0% 100%, rgba(255,255,255,0.12) 0deg, transparent 60deg)",
                }}
              />
            </div>
          )}
        </div>

        {/* Pulse Animations around center */}
        {currentRoom && (
          <>
            <div
              className="absolute w-[180px] h-[180px] rounded-full border border-white/20 pointer-events-none opacity-40"
              style={{ animation: "pulse-ring 3s ease-out infinite" }}
            />
            <div
              className="absolute w-[260px] h-[260px] rounded-full border border-white/10 pointer-events-none opacity-20"
              style={{ animation: "pulse-ring 3s ease-out 1.5s infinite" }}
            />
          </>
        )}
      </div>

      {/* Center Device Node (User) */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative z-10 flex flex-col items-center justify-center text-center"
      >
        <div className="relative group">
          {/* Outer Lightning Glow */}
          <div className="absolute -inset-2 rounded-2xl bg-white/10 blur-md group-hover:bg-white/20 transition-all duration-500" />

          {/* Node Body */}
          <div className="relative w-20 h-20 rounded-2xl bg-dark-800 border border-white/20 flex flex-col items-center justify-center shadow-[0_0_25px_rgba(255,255,255,0.08)] backdrop-blur-xl p-2">
            <div className="text-white mb-1">
              {getDeviceIcon(userDevice)}
            </div>
            <p className="text-[11px] font-semibold text-white/90 max-w-[70px] truncate">
              {userName || "You"}
            </p>
            <p className="text-[9px] text-white/40 max-w-[70px] truncate">
              {userDevice.split(" ")[0]}
            </p>
          </div>

          {/* Online status indicator */}
          <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-dark-900 flex items-center justify-center border border-white/10">
            <span className="w-2 h-2 rounded-full bg-success shadow-[0_0_6px_rgba(34,197,94,0.8)]" />
          </div>
        </div>
      </motion.div>

      {/* Orbiting Peers */}
      <AnimatePresence>
        {peers.map((peer, index) => {
          const totalPeers = peers.length;
          const angle = (index * (2 * Math.PI)) / totalPeers - Math.PI / 2;
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius;

          return (
            <motion.div
              key={peer.socketId}
              initial={{ scale: 0, opacity: 0, x: 0, y: 0 }}
              animate={{
                scale: 1,
                opacity: 1,
                x,
                y,
              }}
              exit={{ scale: 0, opacity: 0, x: 0, y: 0 }}
              transition={{
                type: "spring",
                stiffness: 260,
                damping: 20,
              }}
              className="absolute z-20"
            >
              {/* Connecting Line to Center */}
              <svg
                className="absolute pointer-events-none"
                style={{
                  width: Math.abs(x) + 20,
                  height: Math.abs(y) + 20,
                  left: x < 0 ? x : 0,
                  top: y < 0 ? y : 0,
                  overflow: "visible",
                }}
              >
                <line
                  x1={x < 0 ? Math.abs(x) : 0}
                  y1={y < 0 ? Math.abs(y) : 0}
                  x2={x < 0 ? 0 : x}
                  y2={y < 0 ? 0 : y}
                  stroke="rgba(255,255,255,0.15)"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
              </svg>

              {/* Peer Node Button */}
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onConnect(peer.socketId)}
                className="group relative flex flex-col items-center"
              >
                {/* Glow ring on hover */}
                <div className="absolute -inset-1.5 rounded-xl bg-white/0 group-hover:bg-white/20 blur-sm transition-all duration-300" />

                <div className="relative w-14 h-14 rounded-xl bg-dark-800/90 border border-white/20 group-hover:border-white/50 flex flex-col items-center justify-center p-1.5 shadow-[0_0_15px_rgba(255,255,255,0.05)] backdrop-blur-xl transition-colors">
                  <div className="text-white/80 group-hover:text-white mb-0.5">
                    {getDeviceIcon(peer.device)}
                  </div>
                  <p className="text-[10px] font-medium text-white/90 max-w-[50px] truncate">
                    {peer.name}
                  </p>
                </div>

                {/* Click to connect tooltip badge */}
                <div className="absolute -bottom-5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap bg-white text-black text-[9px] font-bold py-0.5 px-2 rounded-full shadow-lg">
                  Connect
                </div>
              </motion.button>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* Helper text when room is empty or not joined */}
      <div className="absolute -bottom-8 left-0 right-0 text-center pointer-events-none">
        <p className="text-xs text-white/40 font-mono">
          {!currentRoom
            ? "Join a room to discover nearby peers"
            : peers.length === 0
            ? "Waiting for peers to enter room..."
            : `${peers.length} peer${peers.length > 1 ? "s" : ""} nearby • Click to connect`}
        </p>
      </div>
    </div>
  );
}