import { useRef } from "react";
import { motion } from "framer-motion";
import { Upload, FileUp, CheckCircle2, ArrowRight } from "lucide-react";

interface Props {
  file: File | null;
  progress: number;
  connected: boolean;
  onFileSelect: (file: File | null) => void;
  onSend: () => void;
}

export function SendFile({
  file,
  progress,
  connected,
  onFileSelect,
  onSend,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="w-full"
    >
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={(e) => onFileSelect(e.target.files?.[0] || null)}
      />

      {!file ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="group relative border border-dashed border-white/10 hover:border-white/30 bg-dark-900/60 hover:bg-dark-800/80 rounded-2xl p-6 text-center cursor-pointer transition-all duration-300 backdrop-blur-xl"
        >
          <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 group-hover:border-white/20 transition-all duration-300">
            <Upload size={20} className="text-white/70 group-hover:text-white" />
          </div>
          <p className="text-sm font-medium text-white/80 group-hover:text-white">
            Select a file to transfer
          </p>
          <p className="text-xs text-white/40 mt-1">
            {connected
              ? "P2P connection active • Ready for transfer"
              : "Connect with a peer in the room first"}
          </p>
        </div>
      ) : (
        <div className="bg-dark-900/80 border border-white/10 rounded-2xl p-5 backdrop-blur-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                <FileUp size={18} className="text-white/80" />
              </div>
              <div className="truncate">
                <p className="text-sm font-medium text-white/90 truncate">
                  {file.name}
                </p>
                <p className="text-xs text-white/40">
                  {(file.size / (1024 * 1024)).toFixed(2)} MB
                </p>
              </div>
            </div>

            <button
              onClick={() => onFileSelect(null)}
              className="text-xs text-white/40 hover:text-white/80 px-2 py-1 transition-colors"
            >
              Change
            </button>
          </div>

          {progress > 0 && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-white/60">
                <span>Transfer progress</span>
                <span className="font-mono">{progress}%</span>
              </div>
              <div className="h-1.5 w-full bg-dark-700 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-white/40 to-white"
                  style={{ width: `${progress}%` }}
                  transition={{ duration: 0.2 }}
                />
              </div>
            </div>
          )}

          <button
            onClick={onSend}
            disabled={!connected}
            className="w-full relative group overflow-hidden bg-white disabled:bg-dark-700 text-black disabled:text-white/30 font-semibold text-sm py-3 px-6 rounded-xl hover:shadow-[0_0_25px_rgba(255,255,255,0.2)] disabled:hover:shadow-none transition-all duration-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {progress === 100 ? (
              <>
                <CheckCircle2 size={16} className="text-success" />
                Sent Successfully
              </>
            ) : (
              <>
                <span>Send File</span>
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </div>
      )}
    </motion.div>
  );
}