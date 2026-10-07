import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  FolderPlus,
  Upload,
  Folder as FolderIcon,
  FileText,
  Download,
  Trash2,
  ChevronRight,
  LogOut,
  HardDrive,
  RefreshCw,
  X,
  Radio,
} from "lucide-react";
import {
  api,
  type UserProfile,
  type FolderItem,
  type FileItem,
} from "../services/api";
import { LogoMark } from "../components/LogoMark";

interface DashboardPageProps {
  user: UserProfile | null;
  onSignOut: () => void;
  onUserUpdate: (user: UserProfile) => void;
}

function formatBytes(bytesStr: string | number): string {
  const bytes = Number(bytesStr) || 0;
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export function DashboardPage({
  user,
  onSignOut,
  onUserUpdate,
}: DashboardPageProps) {
  const navigate = useNavigate();

  // Cloud Storage State
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [folderPath, setFolderPath] = useState<{ id: string | null; name: string }[]>([
    { id: null, name: "Root" },
  ]);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New Folder Modal
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  // Direct Storage Upload State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  useEffect(() => {
    if (!user) {
      navigate("/");
    }
  }, [user, navigate]);

  useEffect(() => {
    if (user?.id) {
      loadStorageContent(currentFolderId);
    }
  }, [currentFolderId, user?.id]);

  async function loadStorageContent(folderId: string | null) {
    setLoading(true);
    setError(null);
    try {
      const [foldersRes, filesRes] = await Promise.all([
        api.getFolders(folderId),
        api.getFiles(folderId),
      ]);
      setFolders(foldersRes.folders || []);
      setFiles(filesRes.files || []);
    } catch (err: any) {
      console.error("Failed to load cloud storage contents:", err);
      setError(err.message || "Failed to load cloud storage contents");
    } finally {
      setLoading(false);
    }
  }

  async function refreshStorage() {
    await loadStorageContent(currentFolderId);
    try {
      const meRes = await api.getMe();
      onUserUpdate(meRes.user);
    } catch {}
  }

  async function handleCreateFolder(e: React.FormEvent) {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    try {
      await api.createFolder(newFolderName.trim(), currentFolderId);
      setNewFolderName("");
      setNewFolderOpen(false);
      loadStorageContent(currentFolderId);
    } catch (err: any) {
      setError(err.message || "Failed to create folder");
    }
  }

  async function handleDirectUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setUploading(true);
    setUploadProgress(10);
    setError(null);

    try {
      // 1. Request presigned upload URL from Express
      setUploadProgress(25);
      const { fileId, uploadUrl } = await api.getUploadUrl({
        name: selectedFile.name,
        size: selectedFile.size,
        mimeType: selectedFile.type || "application/octet-stream",
        folderId: currentFolderId,
      });

      // 2. Direct browser upload to Supabase Storage
      setUploadProgress(50);
      await api.uploadFileToStorage(uploadUrl, selectedFile);

      // 3. Confirm completion with Express (triggers HeadObject & quota update)
      setUploadProgress(85);
      await api.completeFileUpload(fileId);

      setUploadProgress(100);
      refreshStorage();
    } catch (err: any) {
      setError(err.message || "File upload failed");
    } finally {
      setUploading(false);
      setUploadProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleDownload(fileId: string) {
    try {
      const { downloadUrl, name } = await api.getDownloadUrl(fileId);
      const anchor = document.createElement("a");
      anchor.href = downloadUrl;
      anchor.download = name;
      anchor.click();
    } catch (err: any) {
      setError(err.message || "Failed to download file");
    }
  }

  async function handleDeleteFile(fileId: string) {
    if (!confirm("Are you sure you want to delete this file?")) return;
    try {
      await api.deleteFile(fileId);
      refreshStorage();
    } catch (err: any) {
      setError(err.message || "Failed to delete file");
    }
  }

  async function handleDeleteFolder(folderId: string) {
    if (!confirm("Delete folder and all its contents?")) return;
    try {
      await api.deleteFolder(folderId);
      refreshStorage();
    } catch (err: any) {
      setError(err.message || "Failed to delete folder");
    }
  }

  function navigateToFolder(folder: FolderItem) {
    setCurrentFolderId(folder.id);
    setFolderPath((prev) => [...prev, { id: folder.id, name: folder.name }]);
  }

  function navigateToBreadcrumb(index: number) {
    const target = folderPath[index];
    setCurrentFolderId(target.id);
    setFolderPath(folderPath.slice(0, index + 1));
  }

  if (!user) return null;

  const storageUsedNum = Number(user.storageUsed) || 0;
  const storageLimitNum = Number(user.storageLimit) || 5368709120;
  const storagePercent = Math.min(100, Math.round((storageUsedNum / storageLimitNum) * 100));

  return (
    <div className="relative min-h-screen bg-black text-fafafa font-sans selection:bg-white selection:text-black">
      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-6 min-h-screen flex flex-col justify-between">
        {/* Top Header */}
        <header className="flex items-center justify-between pt-2 pb-6 border-b border-zinc-800">
          {/* Logo & Title */}
          <Link to="/" className="flex items-center gap-2.5 hover:opacity-90 transition-opacity">
            <LogoMark size={20} className="text-white" />
            <span className="text-base font-semibold tracking-tight text-white">
              File Harbor
            </span>
            <span className="text-xs font-mono text-zinc-500 border border-zinc-800 rounded px-1.5 py-0.5 ml-1">
              Cloud
            </span>
          </Link>

          {/* User Profile & Navigation */}
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="hidden sm:flex items-center gap-1.5 text-xs font-mono text-zinc-400 hover:text-white border border-zinc-800 hover:border-zinc-700 px-3 py-1.5 rounded-md transition-colors"
            >
              <Radio size={12} />
              <span>P2P Transfer</span>
            </Link>

            <div className="text-right hidden sm:block">
              <p className="text-xs font-semibold text-white">{user.name}</p>
              <p className="text-[10px] font-mono text-zinc-500">{user.email}</p>
            </div>

            <button
              onClick={onSignOut}
              className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-white p-2 rounded-md transition-colors cursor-pointer"
              title="Sign Out"
            >
              <LogOut size={14} />
            </button>
          </div>
        </header>

        {/* Dashboard Workspace */}
        <div className="my-6 space-y-6">
          {/* Header Bar with Storage Usage */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
            <div>
              <h2 className="text-lg font-semibold text-white">
                Cloud Storage Workspace
              </h2>
              <p className="text-xs font-mono text-zinc-400 mt-0.5">
                Encrypted direct object storage powered by Supabase
              </p>
            </div>

            {/* Storage Quota Meter */}
            <div className="w-full sm:w-64 bg-zinc-900 border border-zinc-800 rounded-md p-2.5 space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className="text-zinc-400 flex items-center gap-1">
                  <HardDrive size={12} />
                  Storage Usage
                </span>
                <span className="text-white font-medium">
                  {formatBytes(user.storageUsed)} / {formatBytes(user.storageLimit)}
                </span>
              </div>
              <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white transition-all duration-300"
                  style={{ width: `${storagePercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Controls Bar: Breadcrumbs & Actions */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            {/* Breadcrumb Navigation */}
            <div className="flex items-center gap-1.5 font-mono text-xs text-zinc-400 overflow-x-auto">
              {folderPath.map((item, index) => (
                <div key={index} className="flex items-center gap-1">
                  {index > 0 && <ChevronRight size={12} className="text-zinc-600" />}
                  <button
                    onClick={() => navigateToBreadcrumb(index)}
                    className={`hover:text-white transition-colors cursor-pointer ${
                      index === folderPath.length - 1 ? "text-white font-semibold" : ""
                    }`}
                  >
                    {item.name}
                  </button>
                </div>
              ))}
            </div>

            {/* Upload & Create Folder Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => refreshStorage()}
                disabled={loading}
                className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-white text-xs p-2 rounded-md transition-colors cursor-pointer"
                title="Refresh Storage"
              >
                <RefreshCw size={13} className={loading ? "animate-spin text-white" : ""} />
              </button>

              <button
                onClick={() => setNewFolderOpen(true)}
                className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 text-xs font-medium px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <FolderPlus size={14} />
                <span>New Folder</span>
              </button>

              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleDirectUpload}
              />

              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="bg-white text-black hover:bg-zinc-200 disabled:bg-zinc-800 disabled:text-zinc-500 text-xs font-medium px-3.5 py-1.5 rounded-md transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Upload size={14} />
                <span>{uploading ? `Uploading (${uploadProgress}%)` : "Upload File"}</span>
              </button>
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded p-3 text-xs text-red-400 font-mono flex items-center justify-between">
              <span>{error}</span>
              <button onClick={() => setError(null)} className="text-red-400 hover:text-white cursor-pointer">
                <X size={14} />
              </button>
            </div>
          )}

          {/* Inline Create Folder Input */}
          {newFolderOpen && (
            <form onSubmit={handleCreateFolder} className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-md p-2">
              <input
                type="text"
                required
                autoFocus
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Folder name"
                className="bg-black border border-zinc-800 rounded px-3 py-1 text-xs text-white placeholder-zinc-600 font-mono focus:border-zinc-400 flex-1"
              />
              <button
                type="submit"
                className="bg-white text-black hover:bg-zinc-200 text-xs font-medium px-3 py-1 rounded cursor-pointer"
              >
                Create
              </button>
              <button
                type="button"
                onClick={() => setNewFolderOpen(false)}
                className="text-zinc-500 hover:text-white text-xs px-2 py-1 cursor-pointer"
              >
                Cancel
              </button>
            </form>
          )}

          {/* Storage Contents Table */}
          <div className="border border-zinc-800 rounded-md overflow-hidden bg-black">
            <div className="grid grid-cols-12 px-4 py-2.5 bg-zinc-950 border-b border-zinc-800 text-[11px] font-mono uppercase tracking-wider text-zinc-500">
              <div className="col-span-6 sm:col-span-6">Name</div>
              <div className="col-span-3 sm:col-span-3">Size</div>
              <div className="col-span-3 sm:col-span-3 text-right">Actions</div>
            </div>

            {loading ? (
              <div className="p-8 text-center text-xs font-mono text-zinc-500 flex items-center justify-center gap-2">
                <RefreshCw size={14} className="animate-spin" />
                <span>Loading files & folders...</span>
              </div>
            ) : folders.length === 0 && files.length === 0 ? (
              <div className="p-12 text-center text-xs font-mono text-zinc-600">
                This folder is empty. Upload a file or create a folder above.
              </div>
            ) : (
              <div className="divide-y divide-zinc-900">
                {/* Folders */}
                {folders.map((folder) => (
                  <div
                    key={folder.id}
                    className="grid grid-cols-12 px-4 py-3 items-center hover:bg-zinc-900/50 transition-colors group text-xs"
                  >
                    <div className="col-span-6 sm:col-span-6 flex items-center gap-2.5 truncate">
                      <FolderIcon size={16} className="text-zinc-400 shrink-0" />
                      <button
                        onClick={() => navigateToFolder(folder)}
                        className="font-medium text-white hover:underline truncate cursor-pointer text-left"
                      >
                        {folder.name}
                      </button>
                    </div>

                    <div className="col-span-3 sm:col-span-3 text-zinc-500 font-mono text-[11px]">
                      Folder
                    </div>

                    <div className="col-span-3 sm:col-span-3 flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleDeleteFolder(folder.id)}
                        className="text-zinc-600 hover:text-red-400 p-1 transition-colors cursor-pointer"
                        title="Delete Folder"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}

                {/* Files */}
                {files.map((file) => (
                  <div
                    key={file.id}
                    className="grid grid-cols-12 px-4 py-3 items-center hover:bg-zinc-900/50 transition-colors group text-xs"
                  >
                    <div className="col-span-6 sm:col-span-6 flex items-center gap-2.5 truncate">
                      <FileText size={16} className="text-zinc-400 shrink-0" />
                      <span className="font-mono text-white truncate">{file.name}</span>
                    </div>

                    <div className="col-span-3 sm:col-span-3 text-zinc-400 font-mono text-[11px]">
                      {formatBytes(file.size)}
                    </div>

                    <div className="col-span-3 sm:col-span-3 flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleDownload(file.id)}
                        className="text-zinc-400 hover:text-white p-1 transition-colors cursor-pointer"
                        title="Download File (Supabase Presigned GET)"
                      >
                        <Download size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteFile(file.id)}
                        className="text-zinc-600 hover:text-red-400 p-1 transition-colors cursor-pointer"
                        title="Delete File"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <footer className="py-4 border-t border-zinc-800 text-center text-[11px] text-zinc-500 font-mono">
          File Harbor • Direct Browser-to-Supabase Storage Encrypted Cloud Storage
        </footer>
      </div>
    </div>
  );
}
