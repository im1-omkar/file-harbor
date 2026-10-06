import { motion } from "framer-motion";
import { Link2, Unlink } from "lucide-react";

interface Props {
  connected: boolean;
  onDisconnect: () => void;
}

export function P2PConnection({ connected, onDisconnect }: Props) {
  if (!connected) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-black border border-emerald-500/30 text-emerald-400 text-[11px] font-mono select-none"
    >
      <Link2 size={12} className="animate-pulse" />
      <span>P2P Channel Active</span>
      <button
        onClick={onDisconnect}
        className="ml-1 text-zinc-500 hover:text-red-400 transition-colors cursor-pointer"
        title="Disconnect P2P Channel"
      >
        <Unlink size={11} />
      </button>
    </motion.div>
  );
}