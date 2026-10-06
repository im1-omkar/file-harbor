interface StatusPanelProps {
    status: string;
    socketId: string;
    currentRoom: string | null;
}

export function StatusPanel({
    status,
    socketId,
    currentRoom,
}: StatusPanelProps) {
    return (
        <div>
            <p>
                <strong>Status:</strong> {status}
            </p>

            <p>
                <strong>Your Socket ID:</strong>{" "}
                {socketId || "Connecting..."}
            </p>

            {currentRoom && (
                <p>
                    <strong>Active Room:</strong> {currentRoom}
                </p>
            )}
        </div>
    );
}