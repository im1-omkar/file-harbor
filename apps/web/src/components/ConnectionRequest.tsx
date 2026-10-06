import type { ConnectionRequest as ConnectionRequestType } from "../types/signaling";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, X, Check } from "lucide-react";

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
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50"
        >
          <div className="bg-dark-800/95 backdrop-blur-xl border border-white/10 rounded-2xl px-5 py-3.5 flex items-center gap-4 shadow-[0_0_30px_rgba(255,255,255,0.08)]">
            <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
              <Zap size={14} className="text-white/70" />
            </div>

            <div className="mr-2">
              <p className="text-xs font-semibold text-white/90">
                {request.peer.name}
              </p>
              <p className="text-[10px] text-white/40">
                {request.peer.device} wants to connect
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onAccept}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-success/15 hover:bg-success/25 border border-success/30 text-success text-xs font-semibold transition-all"
              >
                <Check size={14} />
                <span>Accept</span>
              </button>

              <button
                onClick={onReject}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-danger/15 hover:bg-danger/25 border border-danger/30 text-danger text-xs font-semibold transition-all"
              >
                <X size={14} />
                <span>Reject</span>
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}