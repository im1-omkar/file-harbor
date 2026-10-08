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
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-xs font-mono uppercase tracking-wider text-zinc-400">
          File Transfer
        </label>
        <span className="text-xs font-mono text-zinc-500">
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
          className="border border-dashed border-zinc-700 hover:border-zinc-500 bg-black rounded-lg p-8 text-center cursor-pointer transition-colors group"
        >
          <Upload size={24} className="mx-auto mb-3 text-zinc-500 group-hover:text-white transition-colors" />
          <p className="text-sm font-medium text-zinc-300 group-hover:text-white mb-1.5">
            Select or drop a file to transfer
          </p>
          <p className="text-xs font-mono text-zinc-500">
            Streamed directly over WebRTC P2P channel
          </p>
        </div>
      ) : (
        <div className="border border-zinc-700 bg-black rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 overflow-hidden">
              <FileUp size={20} className="text-zinc-400 shrink-0" />
              <div className="truncate">
                <p className="text-sm font-medium text-white truncate font-mono">
                  {file.name}
                </p>
                <p className="text-xs font-mono text-zinc-400 mt-0.5">
                  {(file.size / (1024 * 1024)).toFixed(2)} MB
                </p>
              </div>
            </div>

            <button
              onClick={() => onFileSelect(null)}
              className="text-sm font-mono text-zinc-400 hover:text-white px-3 py-1.5 rounded-md hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              Clear
            </button>
          </div>

          {progress > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-mono text-zinc-400">
                <span>Progress</span>
                <span>{progress}%</span>
              </div>
              <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
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
            className="w-full bg-white text-black hover:bg-zinc-200 disabled:bg-zinc-800 disabled:text-zinc-500 font-medium text-sm py-2.5 px-4 rounded-md transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
          >
            {progress === 100 ? (
              <>
                <CheckCircle2 size={16} className="text-emerald-600" />
                <span>Sent Successfully</span>
              </>
            ) : (
              <>
                <span>Send File</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}