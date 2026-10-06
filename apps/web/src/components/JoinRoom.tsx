import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, LogOut } from "lucide-react";

interface Props {
  roomId: string;
  name: string;
  currentRoom: string | null;
  onRoomIdChange: (value: string) => void;
  onNameChange: (value: string) => void;
  onJoin: () => void;
  onLeave: () => void;
}

export function JoinRoom({
  roomId,
  name,
  currentRoom,
  onRoomIdChange,
  onNameChange,
  onJoin,
  onLeave,
}: Props) {
  return (
    <div className="w-full space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-500">
          Room Session
        </label>
        {currentRoom && (
          <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Connected to {currentRoom}
          </span>
        )}
      </div>

      <AnimatePresence mode="wait">
        {!currentRoom ? (
          <motion.div
            key="join-inputs"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-3"
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                value={name}
                onChange={(e) => onNameChange(e.target.value)}
                placeholder="Your name"
                className="sm:col-span-2 bg-black border border-zinc-800 rounded-md px-3 py-2 text-sm text-white placeholder-zinc-600 font-mono transition-colors"
              />
              <input
                value={roomId}
                onChange={(e) => onRoomIdChange(e.target.value)}
                placeholder="Room ID"
                className="bg-black border border-zinc-800 rounded-md px-3 py-2 text-sm text-white placeholder-zinc-600 font-mono transition-colors"
              />
            </div>

            <button
              onClick={onJoin}
              className="w-full bg-white text-black font-medium text-sm py-2 px-4 rounded-md hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Join Room</span>
              <ArrowRight size={14} />
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="leave-input"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <button
              onClick={onLeave}
              className="w-full bg-black border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-white font-medium text-sm py-2 px-4 rounded-md transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogOut size={14} />
              <span>Leave Room</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}