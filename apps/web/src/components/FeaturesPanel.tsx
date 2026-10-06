import { motion } from "framer-motion";
import { ShieldCheck, Zap, ServerOff, Share2, FileCode, MonitorSmartphone } from "lucide-react";

export function FeaturesPanel() {
  return (
    <aside className="w-full space-y-6 select-none">
      {/* Section Header */}
      <div>
        <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-500 mb-1">
          Platform Security & Architecture
        </h3>
        <p className="text-xs text-zinc-400">
          Built for high-performance direct browser-to-browser data transfer.
        </p>
      </div>

      {/* Feature Items List - Vercel Bordered Rows */}
      <div className="space-y-4 border-t border-zinc-800 pt-4">
        {/* Item 1 */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex items-start gap-3"
        >
          <ShieldCheck size={16} className="text-white mt-0.5 shrink-0" />
          <div>
            <h4 className="text-xs font-semibold text-white mb-0.5">
              End-to-End Encryption
            </h4>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Streams over WebRTC DTLS/SCTP channels. Data remains private between connected peers.
            </p>
          </div>
        </motion.div>

        {/* Item 2 */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex items-start gap-3 border-t border-zinc-900 pt-3"
        >
          <Zap size={16} className="text-white mt-0.5 shrink-0" />
          <div>
            <h4 className="text-xs font-semibold text-white mb-0.5">
              Direct Peer Bandwidth
            </h4>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Transfers at native LAN or local internet speed without artificial size limits or cloud throttling.
            </p>
          </div>
        </motion.div>

        {/* Item 3 */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex items-start gap-3 border-t border-zinc-900 pt-3"
        >
          <ServerOff size={16} className="text-white mt-0.5 shrink-0" />
          <div>
            <h4 className="text-xs font-semibold text-white mb-0.5">
              Zero Cloud Storage
            </h4>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Signaling server only negotiates handshakes. Files are never stored or logged on servers.
            </p>
          </div>
        </motion.div>
      </div>

      {/* Use Cases Section */}
      <div className="border-t border-zinc-800 pt-4">
        <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-500 mb-3">
          Popular Workflows
        </h3>

        <div className="space-y-2 text-xs text-zinc-400">
          <div className="flex items-center gap-2 font-mono text-[11px] py-1 border-b border-zinc-900">
            <MonitorSmartphone size={13} className="text-zinc-500 shrink-0" />
            <span>Cross-Device Desktop to Phone Transfer</span>
          </div>

          <div className="flex items-center gap-2 font-mono text-[11px] py-1 border-b border-zinc-900">
            <FileCode size={13} className="text-zinc-500 shrink-0" />
            <span>Large Code Repos & Build Archives</span>
          </div>

          <div className="flex items-center gap-2 font-mono text-[11px] py-1">
            <Share2 size={13} className="text-zinc-500 shrink-0" />
            <span>Ad-hoc Ephemeral Peer Sharing Rooms</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
