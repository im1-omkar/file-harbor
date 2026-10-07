const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3001/api";

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${endpoint}`, {

    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    credentials: "include", // Send HttpOnly session cookie
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || `HTTP ${res.status}: ${res.statusText}`);
  }

  return data as T;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  storageLimit: string; // BigInt serialized as string
  storageUsed: string;  // BigInt serialized as string
}

export interface FolderItem {
  id: string;
  name: string;
  userId: string;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FileItem {
  id: string;
  name: string;
  size: string; // BigInt serialized as string
  mimeType: string;
  folderId: string | null;
  status: string;
  createdAt: string;
}

export const api = {
  // Auth
  async signup(data: { email: string; name: string; password: string }) {
    return request<{ user: UserProfile }>("/auth/signup", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async signin(data: { email: string; password: string }) {
    return request<{ user: UserProfile }>("/auth/signin", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async signout() {
    return request<{ success: boolean }>("/auth/signout", {
      method: "POST",
    });
  },

  async getMe() {
    return request<{ user: UserProfile }>("/auth/me");
  },

  async googleAuth(data: { email: string; name: string; avatarUrl?: string }) {
    return request<{ user: UserProfile }>("/auth/google", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // Folders
  async getFolders(parentId?: string | null) {
    const query = parentId ? `?parentId=${encodeURIComponent(parentId)}` : "";
    return request<{ folders: FolderItem[] }>(`/folders${query}`);
  },

  async createFolder(name: string, parentId?: string | null) {
    return request<{ folder: FolderItem }>("/folders", {
      method: "POST",
      body: JSON.stringify({ name, parentId }),
    });
  },

  async renameFolder(id: string, name: string) {
    return request<{ folder: FolderItem }>(`/folders/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ name }),
    });
  },

  async deleteFolder(id: string) {
    return request<{ success: boolean; freedBytes: string }>(`/folders/${id}`, {
      method: "DELETE",
    });
  },

  // Files & R2 Direct Upload
  async getFiles(folderId?: string | null) {
    const query = folderId ? `?folderId=${encodeURIComponent(folderId)}` : "";
    return request<{ files: FileItem[] }>(`/files${query}`);
  },

  async getUploadUrl(data: {
    name: string;
    size: number;
    mimeType: string;
    folderId?: string | null;
  }) {
    return request<{ fileId: string; uploadUrl: string; objectKey: string }>(
      "/files/upload-url",
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    );
  },

  async uploadFileToR2(uploadUrl: string, file: File) {
    const res = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": file.type || "application/octet-stream",
      },
      body: file,
    });
    if (!res.ok) {
      throw new Error(`Failed to upload file to R2: ${res.statusText}`);
    }
  },

  async completeFileUpload(fileId: string) {
    return request<{ file: FileItem }>(`/files/${fileId}/complete`, {
      method: "POST",
    });
  },

  async getDownloadUrl(fileId: string) {
    return request<{ downloadUrl: string; name: string }>(
      `/files/${fileId}/download`
    );
  },

  async deleteFile(fileId: string) {
    return request<{ success: boolean }>(`/files/${fileId}`, {
      method: "DELETE",
    });
  },
};
