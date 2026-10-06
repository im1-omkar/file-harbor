import {
    useCallback,
    useRef,
    useState,
} from "react";

import {
    BUFFER_LIMIT,
    CHUNK_SIZE,
} from "../config/constants";

import type { IncomingFile } from "../types/file";

interface UseFileTransferOptions {
    setStatus: (status: string) => void;
}

export function useFileTransfer({
    setStatus,
}: UseFileTransferOptions) {
    const [selectedFile, setSelectedFile] =
        useState<File | null>(null);

    const [progress, setProgress] = useState(0);

    const incomingFile =
        useRef<IncomingFile | null>(null);

    const receivedChunks =
        useRef<BlobPart[]>([]);

    const receivedBytes =
        useRef(0);

    /*
     * Handles both:
     * - JSON control messages
     * - binary file chunks
     */
    const receiveMessage = useCallback(
        (data: string | ArrayBuffer) => {
            // -----------------------------
            // JSON/control message
            // -----------------------------

            if (typeof data === "string") {
                try {
                    const message = JSON.parse(data);

                    // -------------------------
                    // File started
                    // -------------------------

                    if (message.type === "file-start") {
                        incomingFile.current = {
                            name: message.name,
                            size: message.size,
                            type: message.mimeType,
                        };

                        receivedChunks.current = [];
                        receivedBytes.current = 0;

                        setProgress(0);

                        setStatus(
                            `Receiving ${message.name}...`,
                        );
                    }

                    // -------------------------
                    // File ended
                    // -------------------------

                    if (message.type === "file-end") {
                        const fileInfo =
                            incomingFile.current;

                        if (!fileInfo) {
                            return;
                        }

                        if (
                            receivedBytes.current !==
                            fileInfo.size
                        ) {
                            setStatus(
                                "File size mismatch. Transfer incomplete.",
                            );

                            return;
                        }

                        const blob = new Blob(
                            receivedChunks.current,
                            {
                                type:
                                    fileInfo.type ||
                                    "application/octet-stream",
                            },
                        );

                        const url =
                            URL.createObjectURL(blob);

                        const anchor =
                            document.createElement("a");

                        anchor.href = url;
                        anchor.download = fileInfo.name;

                        anchor.click();

                        setTimeout(() => {
                            URL.revokeObjectURL(url);
                        }, 60_000);

                        setStatus(
                            `Received ${fileInfo.name} successfully!`,
                        );

                        incomingFile.current = null;
                        receivedChunks.current = [];
                        receivedBytes.current = 0;

                        setProgress(100);
                    }
                } catch (error) {
                    console.error(
                        "Failed to parse data channel message:",
                        error,
                    );
                }

                return;
            }

            // -----------------------------
            // Binary file chunk
            // -----------------------------

            const fileInfo =
                incomingFile.current;

            if (!fileInfo) {
                return;
            }

            receivedChunks.current.push(data);

            receivedBytes.current +=
                data.byteLength;

            setProgress(
                Math.min(
                    100,
                    Math.round(
                        (receivedBytes.current /
                            fileInfo.size) *
                        100,
                    ),
                ),
            );
        },
        [setStatus],
    );

    /*
     * Backpressure handling.
     *
     * RTCDataChannel has a send buffer.
     * We don't want to dump the entire file
     * into it at once.
     */
    const waitForBufferDrain = useCallback(
        (dc: RTCDataChannel): Promise<void> => {
            if (dc.readyState !== "open") {
                return Promise.reject(
                    new Error(
                        "DataChannel is not open",
                    ),
                );
            }

            if (
                dc.bufferedAmount <= BUFFER_LIMIT
            ) {
                return Promise.resolve();
            }

            return new Promise(
                (resolve, reject) => {
                    const cleanup = () => {
                        dc.removeEventListener(
                            "bufferedamountlow",
                            onLow,
                        );

                        dc.removeEventListener(
                            "close",
                            onClose,
                        );

                        dc.removeEventListener(
                            "error",
                            onError,
                        );
                    };

                    const onLow = () => {
                        cleanup();
                        resolve();
                    };

                    const onClose = () => {
                        cleanup();

                        reject(
                            new Error(
                                "DataChannel closed during transfer",
                            ),
                        );
                    };

                    const onError = () => {
                        cleanup();

                        reject(
                            new Error(
                                "DataChannel error during transfer",
                            ),
                        );
                    };

                    dc.addEventListener(
                        "bufferedamountlow",
                        onLow,
                    );

                    dc.addEventListener(
                        "close",
                        onClose,
                    );

                    dc.addEventListener(
                        "error",
                        onError,
                    );

                    // Handle race condition where the
                    // buffer drained before listeners
                    // were attached.
                    if (
                        dc.bufferedAmount <=
                        BUFFER_LIMIT
                    ) {
                        onLow();
                    }
                },
            );
        },
        [],
    );

    /*
     * Sends a file over an already-established
     * RTCDataChannel.
     */
    const sendFile = useCallback(
        async (dc: RTCDataChannel | null) => {
            if (
                !selectedFile ||
                !dc ||
                dc.readyState !== "open"
            ) {
                setStatus(
                    "No active P2P connection or file selected",
                );

                return;
            }

            try {
                const file = selectedFile;

                setProgress(0);

                setStatus(
                    `Sending ${file.name}...`,
                );

                // -------------------------
                // Tell receiver about file
                // -------------------------

                dc.send(
                    JSON.stringify({
                        type: "file-start",
                        name: file.name,
                        size: file.size,
                        mimeType: file.type,
                    }),
                );

                let sentBytes = 0;

                // -------------------------
                // Send chunks
                // -------------------------

                while (sentBytes < file.size) {
                    await waitForBufferDrain(dc);

                    if (dc.readyState !== "open") {
                        throw new Error(
                            "Connection closed during transfer",
                        );
                    }

                    const chunk = file.slice(
                        sentBytes,
                        sentBytes + CHUNK_SIZE,
                    );

                    const buffer =
                        await chunk.arrayBuffer();

                    dc.send(buffer);

                    sentBytes += buffer.byteLength;

                    setProgress(
                        Math.round(
                            (sentBytes / file.size) *
                            100,
                        ),
                    );
                }

                // Make sure all buffered data has
                // drained before sending file-end.
                await waitForBufferDrain(dc);

                // -------------------------
                // Tell receiver file ended
                // -------------------------

                dc.send(
                    JSON.stringify({
                        type: "file-end",
                    }),
                );

                setStatus(
                    `File sent: ${file.name}`,
                );
            } catch (error) {
                console.error(error);

                setStatus(
                    error instanceof Error
                        ? error.message
                        : "Transfer failed",
                );
            }
        },
        [
            selectedFile,
            setStatus,
            waitForBufferDrain,
        ],
    );

    return {
        selectedFile,
        setSelectedFile,
        progress,
        receiveMessage,
        sendFile,
    };
}