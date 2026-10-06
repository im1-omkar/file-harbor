interface Props {
    roomId: string;
    name: string;
    currentRoom: string | null;

    onRoomIdChange: (value: string) => void;
    onNameChange: (value: string) => void;

    onJoin: () => void;
    onLeave: () => void;
}

export function JoinRoom({
    roomId,
    name,
    currentRoom,
    onRoomIdChange,
    onNameChange,
    onJoin,
    onLeave,
}: Props) {
    return (
        <section>
            <h3>Join Room</h3>

            <input
                value={name}
                onChange={(e) => onNameChange(e.target.value)}
                placeholder="Your name"
            />

            <input
                value={roomId}
                onChange={(e) => onRoomIdChange(e.target.value)}
                placeholder="Room ID"
            />

            <button
                onClick={onJoin}
                disabled={Boolean(currentRoom)}
            >
                Join Room
            </button>

            {currentRoom && (
                <button onClick={onLeave}>
                    Leave Room
                </button>
            )}
        </section>
    );
}