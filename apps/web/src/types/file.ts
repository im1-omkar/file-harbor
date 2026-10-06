export interface IncomingFile {
    name: string;
    size: number;
    type: string;
}

export interface FileStartMessage {
    type: "file-start";
    name: string;
    size: number;
    mimeType: string;
}

export interface FileEndMessage {
    type: "file-end";
}

export type FileMessage =
    | FileStartMessage
    | FileEndMessage;