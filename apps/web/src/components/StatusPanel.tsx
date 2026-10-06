interface StatusPanelProps {
  status: string;
  socketId: string;
  currentRoom: string | null;
}

export function StatusPanel({ status, socketId, currentRoom }: StatusPanelProps) {
  return (
    <div className="fixed top-4 left-4 z-50 max-w-xs">
      <div className="flex items-center gap-2 mb-1">
        <div
          className={`w-1.5 h-1.5 rounded-full ${
            socketId ? "bg-success" : "bg-danger"
          }`}
          style={{
            boxShadow: socketId
              ? "0 0 6px rgba(34,197,94,0.5)"
              : "0 0 6px rgba(239,68,68,0.5)",
          }}
        />
        <p className="text-[11px] text-dark-300 font-mono truncate">{status}</p>
      </div>

      <p className="text-[10px] text-dark-400 font-mono pl-3.5">
        ID: {socketId ? socketId.slice(0, 12) + "…" : "—"}
      </p>

      {currentRoom && (
        <p className="text-[10px] text-dark-300 font-mono pl-3.5 mt-0.5">
          Room: <span className="text-accent-dim">{currentRoom}</span>
        </p>
      )}
    </div>
  );
}