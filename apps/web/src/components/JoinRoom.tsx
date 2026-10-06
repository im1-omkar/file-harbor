import { motion, AnimatePresence } from "framer-motion";
import { LogIn, LogOut } from "lucide-react";

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
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
    >
      <AnimatePresence mode="wait">
        {!currentRoom ? (
          <motion.div
            key="join"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="space-y-3"
          >
            <div className="flex gap-2">
              <input
                value={name}
                onChange={(e) => onNameChange(e.target.value)}
                placeholder="Your name"
                className="flex-1 bg-dark-800 border border-white/[0.06] rounded-lg px-3 py-2 text-sm text-white/90 placeholder-white/20 focus:border-white/20 transition-colors"
              />
              <input
                value={roomId}
                onChange={(e) => onRoomIdChange(e.target.value)}
                placeholder="Room ID"
                className="w-28 bg-dark-800 border border-white/[0.06] rounded-lg px-3 py-2 text-sm text-white/90 placeholder-white/20 focus:border-white/20 transition-colors font-mono"
              />
            </div>

            <button
              onClick={onJoin}
              className="w-full group relative overflow-hidden bg-white text-black font-semibold text-sm py-3 px-6 rounded-xl hover:shadow-[0_0_20px_rgba(255,255,255,0.15)] transition-all duration-300"
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                <LogIn size={16} />
                Join Room
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="leave"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            <button
              onClick={onLeave}
              className="w-full flex items-center justify-center gap-2 bg-dark-800 border border-white/[0.06] text-white/60 hover:text-danger hover:border-danger/30 text-sm py-2.5 px-4 rounded-xl transition-all duration-200"
            >
              <LogOut size={14} />
              Leave Room
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}