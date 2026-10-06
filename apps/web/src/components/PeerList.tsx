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
    return <Smartphone size={16} />;
  }
  if (lower.includes("mac") || lower.includes("laptop")) {
    return <Laptop size={16} />;
  }
  return <Monitor size={16} />;
}

export function PeerList({
  peers,
  currentRoom,
  userName,
  userDevice,
  onConnect,
}: Props) {
  const radius = 140; // Orbit radius in px

  return (
    <div className="relative w-full aspect-square max-w-[340px] sm:max-w-[380px] mx-auto flex items-center justify-center select-none my-2">
      {/* Concentric Radar Circles */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[300px] h-[300px] rounded-full border border-zinc-900 relative flex items-center justify-center">
          <div className="w-[200px] h-[200px] rounded-full border border-zinc-900 flex items-center justify-center">
            <div className="w-[100px] h-[100px] rounded-full border border-zinc-900" />
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
                    "conic-gradient(from 0deg at 0% 100%, rgba(255,255,255,0.06) 0deg, transparent 50deg)",
                }}
              />
            </div>
          )}
        </div>

        {/* Subtle Pulse Animation when in room */}
        {currentRoom && (
          <div
            className="absolute w-[160px] h-[160px] rounded-full border border-zinc-800 pointer-events-none"
            style={{ animation: "pulse-ring 4s ease-out infinite" }}
          />
        )}
      </div>

      {/* Center Device Node (User) - Vercel Minimalist Badge */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative z-10 flex flex-col items-center justify-center text-center"
      >
        <div className="bg-black border border-zinc-800 rounded-lg p-3 text-center min-w-[90px] shadow-2xl">
          <div className="text-zinc-300 flex justify-center mb-1">
            {getDeviceIcon(userDevice)}
          </div>
          <p className="text-xs font-semibold text-white truncate max-w-[80px]">
            {userName || "You"}
          </p>
          <p className="text-[10px] font-mono text-zinc-500 truncate max-w-[80px]">
            {userDevice.split(" ")[0]}
          </p>
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
              animate={{ scale: 1, opacity: 1, x, y }}
              exit={{ scale: 0, opacity: 0, x: 0, y: 0 }}
              transition={{ type: "spring", stiffness: 240, damping: 20 }}
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
                  stroke="#2e2e2e"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                />
              </svg>

              {/* Vercel-style Peer Node Button */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => onConnect(peer.socketId)}
                className="group bg-black border border-zinc-800 hover:border-zinc-600 text-white rounded-md px-3 py-2 text-center shadow-lg transition-colors cursor-pointer flex flex-col items-center min-w-[76px]"
              >
                <div className="text-zinc-400 group-hover:text-white mb-0.5">
                  {getDeviceIcon(peer.device)}
                </div>
                <p className="text-[11px] font-mono font-medium text-white truncate max-w-[65px]">
                  {peer.name}
                </p>
                <span className="text-[9px] font-mono text-zinc-500 group-hover:text-zinc-300 transition-colors mt-0.5">
                  Connect
                </span>
              </motion.button>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* Subtext under radar */}
      <div className="absolute -bottom-6 left-0 right-0 text-center pointer-events-none">
        <p className="text-[11px] font-mono text-zinc-500">
          {!currentRoom
            ? "Enter a room ID below to discover peers"
            : peers.length === 0
            ? "Waiting for peers to enter room..."
            : `${peers.length} peer${peers.length > 1 ? "s" : ""} online • Click to connect`}
        </p>
      </div>
    </div>
  );
}