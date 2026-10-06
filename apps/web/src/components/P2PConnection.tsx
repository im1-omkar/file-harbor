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
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-success/10 border border-success/30 text-success text-xs font-mono backdrop-blur-xl"
    >
      <Link2 size={12} className="animate-pulse" />
      <span>P2P Channel Active</span>
      <button
        onClick={onDisconnect}
        className="ml-1 p-0.5 hover:bg-danger/20 hover:text-danger rounded transition-colors text-white/50"
        title="Disconnect P2P"
      >
        <Unlink size={12} />
      </button>
    </motion.div>
  );
}