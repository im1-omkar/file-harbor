interface StatusPanelProps {
  status: string;
  socketId: string;
  currentRoom: string | null;
}

export function StatusPanel({ status, socketId, currentRoom }: StatusPanelProps) {
  return (
    <div className="fixed bottom-6 left-6 z-50 font-mono text-xs leading-relaxed space-y-1 select-none bg-black/60 p-4 rounded-xl border border-white/10 backdrop-blur-md shadow-2xl">
      <div className="flex items-center gap-2 mb-2">
        <span
          className={`w-2 h-2 rounded-full ${
            socketId ? "bg-emerald-500" : "bg-red-500"
          }`}
        />
        <span className="text-zinc-300 font-medium">{status}</span>
      </div>

      <div className="text-zinc-500 pl-4">
        ID: <span className="text-zinc-400">{socketId ? socketId.slice(0, 14) + "…" : "—"}</span>
      </div>

      {currentRoom && (
        <div className="text-zinc-500 pl-4">
          Room: <span className="text-white font-semibold">{currentRoom}</span>
        </div>
      )}
    </div>
  );
}