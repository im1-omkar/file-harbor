import type { Peer } from "../types/peer";

interface Props {
    peers: Peer[];
    currentRoom: string | null;
    onConnect: (socketId: string) => void;
}

export function PeerList({
    peers,
    currentRoom,
    onConnect,
}: Props) {
    return (
        <section>
            <h3>Peers in Room</h3>

            {peers.length === 0 && (
                <p>
                    {currentRoom
                        ? "No other peers in this room."
                        : "Join a room to see peers."}
                </p>
            )}

            {peers.map((peer) => (
                <div key={peer.socketId}>
                    <span>
                        <strong>{peer.name}</strong> — {peer.device}
                    </span>

                    <button
                        onClick={() => onConnect(peer.socketId)}
                    >
                        Connect
                    </button>
                </div>
            ))}
        </section>
    );
}