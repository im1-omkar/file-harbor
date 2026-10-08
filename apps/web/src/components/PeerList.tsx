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
    return <Smartphone size={20} />;
  }
  if (lower.includes("mac") || lower.includes("laptop")) {
    return <Laptop size={20} />;
  }
  return <Monitor size={20} />;
}

export function PeerList({
  peers,
  currentRoom,
  userName,
  userDevice,
  onConnect,
}: Props) {
  const radius = 150; // Orbit radius in px (slightly larger)

  return (
    <div className="relative w-full aspect-square max-w-[380px] sm:max-w-[420px] mx-auto flex items-center justify-center select-none my-4">
      {/* Concentric Radar Circles */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[320px] h-[320px] rounded-full border border-zinc-800 relative flex items-center justify-center">
          <div className="w-[220px] h-[220px] rounded-full border border-zinc-800 flex items-center justify-center">
            <div className="w-[120px] h-[120px] rounded-full border border-zinc-800" />
          </div>

          {/* Sweeping Radar Line */}
          {currentRoom && (
            <div
              className="absolute inset-0 rounded-full overflow-hidden opacity-50"
              style={{ animation: "radar-sweep 8s linear infinite" }}
            >
              <div
                className="w-1/2 h-1/2 absolute top-0 right-0 origin-bottom-left"
                style={{
                  background:
                    "conic-gradient(from 0deg at 0% 100%, rgba(255,255,255,0.08) 0deg, transparent 60deg)",
                }}
              />
            </div>
          )}
        </div>

        {/* Subtle Pulse Animation when in room */}
        {currentRoom && (
          <div
            className="absolute w-[180px] h-[180px] rounded-full border border-zinc-700 pointer-events-none"
            style={{ animation: "pulse-ring 4s ease-out infinite" }}
          />
        )}
      </div>

      {/* Center Device Node (User) */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative z-10 flex flex-col items-center justify-center text-center"
      >
        <div className="bg-black border border-zinc-700 rounded-xl p-4 text-center min-w-[100px] shadow-2xl">
          <div className="text-white flex justify-center mb-2">
            {getDeviceIcon(userDevice)}
          </div>
          <p className="text-sm font-semibold text-white truncate max-w-[90px]">
            {userName || "You"}
          </p>
          <p className="text-xs font-mono text-zinc-400 truncate max-w-[90px] mt-0.5">
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
                  stroke="#3f3f46"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                />
              </svg>

              {/* Peer Node Button */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => onConnect(peer.socketId)}
                className="group bg-black border border-zinc-700 hover:border-zinc-500 text-white rounded-xl p-3 text-center shadow-xl transition-colors cursor-pointer flex flex-col items-center min-w-[90px]"
              >
                <div className="text-zinc-400 group-hover:text-white mb-1.5 transition-colors">
                  {getDeviceIcon(peer.device)}
                </div>
                <p className="text-xs font-mono font-medium text-white truncate max-w-[80px]">
                  {peer.name}
                </p>
                <span className="text-[10px] font-mono text-zinc-500 group-hover:text-zinc-300 transition-colors mt-1 bg-zinc-900 px-2 py-0.5 rounded-full">
                  Connect
                </span>
              </motion.button>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* Subtext under radar */}
      <div className="absolute -bottom-8 left-0 right-0 text-center pointer-events-none">
        <p className="text-xs font-mono text-zinc-500">
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