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
    return (
        <section>
            <h3>Send File</h3>

            <input
                type="file"
                onChange={(e) =>
                    onFileSelect(e.target.files?.[0] || null)
                }
            />

            {file && (
                <p>
                    Selected: <strong>{file.name}</strong>{" "}
                    ({(file.size / (1024 * 1024)).toFixed(2)} MB)
                </p>
            )}

            <button
                onClick={onSend}
                disabled={!connected || !file}
            >
                Send File
            </button>

            <p>Transfer progress: {progress}%</p>

            <progress
                value={progress}
                max={100}
            />
        </section>
    );
}