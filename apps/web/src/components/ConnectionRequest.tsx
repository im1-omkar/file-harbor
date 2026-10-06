import type { ConnectionRequest as ConnectionRequestType } from "../types/signaling";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, X } from "lucide-react";

interface Props {
  request: ConnectionRequestType | null;
  onAccept: () => void;
  onReject: () => void;
}

export function ConnectionRequest({ request, onAccept, onReject }: Props) {
  return (
    <AnimatePresence>
      {request && (
        <motion.div
          initial={{ opacity: 0, y: -16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -16, scale: 0.98 }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50"
        >
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 flex items-center gap-4 shadow-2xl">
            <div>
              <p className="text-xs font-semibold text-white">
                {request.peer.name}
              </p>
              <p className="text-[11px] font-mono text-zinc-400">
                {request.peer.device} wants to connect
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onAccept}
                className="bg-white text-black hover:bg-zinc-200 text-xs font-medium px-3 py-1.5 rounded transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <span>Accept</span>
                <ArrowRight size={12} />
              </button>

              <button
                onClick={onReject}
                className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium px-2.5 py-1.5 rounded transition-colors flex items-center gap-1 cursor-pointer"
              >
                <X size={12} />
                <span>Decline</span>
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}