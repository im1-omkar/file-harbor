import type { ConnectionRequest } from "../types/signaling";

interface Props {
    request: ConnectionRequest | null;
    onAccept: () => void;
    onReject: () => void;
}

export function ConnectionRequest({
    request,
    onAccept,
    onReject,
}: Props) {
    if (!request) return null;

    return (
        <div>
            <p>
                <strong>{request.peer.name}</strong>{" "}
                ({request.peer.device}) wants to connect.
            </p>

            <button onClick={onAccept}>
                Accept
            </button>

            <button onClick={onReject}>
                Reject
            </button>
        </div>
    );
}