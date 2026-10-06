interface Props {
    connected: boolean;
    onDisconnect: () => void;
}

export function P2PConnection({
    connected,
    onDisconnect,
}: Props) {
    return (
        <section>
            <h3>P2P Connection</h3>

            <p>
                DataChannel:{" "}
                <strong>
                    {connected ? "Connected" : "Not connected"}
                </strong>
            </p>

            {connected && (
                <button onClick={onDisconnect}>
                    Disconnect P2P
                </button>
            )}
        </section>
    );
}