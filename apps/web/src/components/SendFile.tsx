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
    <div className="w-full space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-500">
          File Transfer
        </label>
        <span className="text-[11px] font-mono text-zinc-500">
          {connected ? "Peer Connected" : "No Active Peer"}
        </span>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={(e) => onFileSelect(e.target.files?.[0] || null)}
      />

      {!file ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border border-dashed border-zinc-800 hover:border-zinc-600 bg-black rounded-md p-6 text-center cursor-pointer transition-colors group"
        >
          <Upload size={18} className="mx-auto mb-2 text-zinc-500 group-hover:text-white transition-colors" />
          <p className="text-xs font-medium text-zinc-300 group-hover:text-white">
            Select or drop a file to transfer
          </p>
          <p className="text-[11px] font-mono text-zinc-600 mt-1">
            Streamed directly over WebRTC P2P channel
          </p>
        </div>
      ) : (
        <div className="border border-zinc-800 bg-black rounded-md p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <FileUp size={16} className="text-zinc-400 shrink-0" />
              <div className="truncate">
                <p className="text-xs font-medium text-white truncate font-mono">
                  {file.name}
                </p>
                <p className="text-[11px] font-mono text-zinc-500">
                  {(file.size / (1024 * 1024)).toFixed(2)} MB
                </p>
              </div>
            </div>

            <button
              onClick={() => onFileSelect(null)}
              className="text-xs font-mono text-zinc-500 hover:text-white px-2 py-1 transition-colors cursor-pointer"
            >
              Clear
            </button>
          </div>

          {progress > 0 && (
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] font-mono text-zinc-400">
                <span>Progress</span>
                <span>{progress}%</span>
              </div>
              <div className="h-1 w-full bg-zinc-800 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-white"
                  style={{ width: `${progress}%` }}
                  transition={{ duration: 0.15 }}
                />
              </div>
            </div>
          )}

          <button
            onClick={onSend}
            disabled={!connected}
            className="w-full bg-white text-black hover:bg-zinc-200 disabled:bg-zinc-800 disabled:text-zinc-500 font-medium text-sm py-2 px-4 rounded-md transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
          >
            {progress === 100 ? (
              <>
                <CheckCircle2 size={14} className="text-emerald-600" />
                <span>Sent Successfully</span>
              </>
            ) : (
              <>
                <span>Send File</span>
                <ArrowRight size={14} />
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}