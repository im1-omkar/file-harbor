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
  RefreshCw,
  X,
  Radio,
  Plus,
  Search,
  Menu,
  Image as ImageIcon,
  FileCode,
  FileArchive,
  Cloud,
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

function getFileIcon(name: string) {
  const ext = name.split('.').pop()?.toLowerCase();
  if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(ext || '')) return ImageIcon;
  if (['zip', 'tar', 'gz', 'rar', '7z'].includes(ext || '')) return FileArchive;
  if (['js', 'ts', 'jsx', 'tsx', 'html', 'css', 'json', 'py', 'rs', 'go'].includes(ext || '')) return FileCode;
  return FileText;
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
    { id: null, name: "My Drive" },
  ]);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // UI State
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isNewMenuOpen, setIsNewMenuOpen] = useState(false);
  
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

  // Click outside to close menus
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!(e.target as Element).closest('.new-menu-container')) {
        setIsNewMenuOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

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
      setIsNewMenuOpen(false);
      loadStorageContent(currentFolderId);
    } catch (err: any) {
      setError(err.message || "Failed to create folder");
    }
  }

  async function handleDirectUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setIsNewMenuOpen(false);
    setUploading(true);
    setUploadProgress(10);
    setError(null);

    try {
      setUploadProgress(25);
      const { fileId, uploadUrl } = await api.getUploadUrl({
        name: selectedFile.name,
        size: selectedFile.size,
        mimeType: selectedFile.type || "application/octet-stream",
        folderId: currentFolderId,
      });

      setUploadProgress(50);
      await api.uploadFileToStorage(uploadUrl, selectedFile);

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
    <div className="flex h-screen bg-[#131314] text-[#e3e3e3] font-sans overflow-hidden selection:bg-[#a8c7fa]/30 selection:text-white">
      
      {/* Sidebar */}
      <aside className={`fixed md:static inset-y-0 left-0 z-40 w-64 bg-[#131314] border-r border-[#333537] transform transition-transform duration-300 md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} flex flex-col`}>
        <div className="h-16 flex items-center px-6">
          <Link to="/" className="flex items-center gap-2">
            <LogoMark size={24} className="text-[#e3e3e3]" />
            <span className="text-[22px] font-medium tracking-tight text-white">File Harbor</span>
          </Link>
        </div>

        <div className="px-4 py-2 relative new-menu-container">
          <button 
            onClick={() => setIsNewMenuOpen(!isNewMenuOpen)}
            className="flex items-center gap-3 bg-[#c2e7ff] text-[#001d35] hover:bg-[#a8c7fa] hover:shadow-md transition-all px-4 py-3 rounded-2xl font-medium w-[120px]"
          >
            <Plus size={20} />
            <span>New</span>
          </button>

          {/* New Dropdown */}
          {isNewMenuOpen && (
            <div className="absolute top-16 left-4 w-48 bg-[#282a2c] border border-[#333537] rounded-lg shadow-xl py-2 z-50">
              <button 
                onClick={() => {
                  setNewFolderOpen(true);
                  setIsNewMenuOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-[#e3e3e3] hover:bg-[#333537] transition-colors"
              >
                <FolderPlus size={18} className="text-[#e3e3e3]" />
                <span>New folder</span>
              </button>
              <div className="h-px bg-[#333537] my-2"></div>
              <button 
                onClick={() => {
                  fileInputRef.current?.click();
                  setIsNewMenuOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-[#e3e3e3] hover:bg-[#333537] transition-colors"
              >
                <Upload size={18} className="text-[#e3e3e3]" />
                <span>File upload</span>
              </button>
            </div>
          )}
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <button 
            onClick={() => {
              setCurrentFolderId(null);
              setFolderPath([{ id: null, name: "My Drive" }]);
            }}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-full text-sm font-medium transition-colors ${!currentFolderId ? 'bg-[#c2e7ff] text-[#001d35]' : 'text-[#e3e3e3] hover:bg-[#333537]'}`}
          >
            <Cloud size={20} />
            My Drive
          </button>
          
          <Link 
            to="/" 
            className="w-full flex items-center gap-3 px-3 py-2 rounded-full text-sm font-medium text-[#e3e3e3] hover:bg-[#333537] transition-colors"
          >
            <Radio size={20} />
            P2P Transfer
          </Link>
        </nav>

        <div className="p-4 mx-3 mb-4 rounded-xl space-y-3">
          <div className="flex items-center gap-3 text-sm text-[#e3e3e3]">
            <Cloud size={20} className="text-[#c4c7c5]" />
            <span>Storage</span>
          </div>
          <div className="space-y-1.5">
            <div className="h-1.5 w-full bg-[#333537] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#c2e7ff] rounded-full transition-all duration-300"
                style={{ width: `${storagePercent}%` }}
              />
            </div>
            <p className="text-xs text-[#c4c7c5]">
              {formatBytes(user.storageUsed)} of {formatBytes(user.storageLimit)} used
            </p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen min-w-0 bg-[#131314]">
        
        {/* Header */}
        <header className="h-16 px-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="md:hidden p-2 text-[#e3e3e3] hover:bg-[#333537] rounded-full"
            >
              <Menu size={24} />
            </button>
            <div className="hidden sm:flex items-center bg-[#282a2c] px-4 py-2 rounded-full w-[400px] max-w-full group focus-within:bg-[#333537] transition-colors shadow-sm">
              <Search size={20} className="text-[#c4c7c5]" />
              <input 
                type="text" 
                placeholder="Search in Drive"
                className="bg-transparent border-none outline-none text-[#e3e3e3] placeholder-[#c4c7c5] ml-3 w-full text-base"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex flex-col items-end mr-2">
              <span className="text-sm font-medium text-white leading-tight">{user.name}</span>
              <span className="text-xs text-[#c4c7c5]">{user.email}</span>
            </div>
            <button
              onClick={onSignOut}
              className="p-2 text-[#e3e3e3] hover:bg-[#333537] rounded-full transition-colors cursor-pointer"
              title="Sign Out"
            >
              <LogOut size={20} />
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 pb-6 bg-[#131314]">
          <div className="max-w-[1600px] mx-auto bg-[#1e1f20] min-h-[calc(100vh-80px)] rounded-3xl p-6 shadow-sm ring-1 ring-white/[0.05]">
            
            {/* Breadcrumbs */}
            <div className="flex items-center justify-between mb-6 border-b border-[#333537] pb-4">
              <div className="flex items-center gap-1 text-lg sm:text-xl font-medium text-[#e3e3e3]">
                {folderPath.map((item, index) => (
                  <div key={index} className="flex items-center">
                    {index > 0 && <ChevronRight size={20} className="text-[#c4c7c5] mx-1" />}
                    <button
                      onClick={() => navigateToBreadcrumb(index)}
                      className={`hover:bg-[#333537] px-2 py-1 rounded-md transition-colors cursor-pointer ${
                        index === folderPath.length - 1 ? "text-white" : "text-[#c4c7c5]"
                      }`}
                    >
                      {item.name}
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={refreshStorage}
                disabled={loading}
                className="p-2 text-[#c4c7c5] hover:bg-[#333537] hover:text-[#e3e3e3] rounded-full transition-colors cursor-pointer"
                title="Refresh"
              >
                <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
              </button>
            </div>

            {/* Error Banner */}
            {error && (
              <div className="mb-6 bg-red-900/30 border border-red-500/30 rounded-lg p-3 text-sm text-red-200 flex items-center justify-between">
                <span>{error}</span>
                <button onClick={() => setError(null)} className="text-red-300 hover:text-white cursor-pointer p-1 rounded hover:bg-red-900/50">
                  <X size={16} />
                </button>
              </div>
            )}
            
            {/* Upload Progress */}
            {uploading && (
              <div className="mb-6 bg-[#282a2c] rounded-lg p-4 border border-[#333537]">
                <div className="flex items-center justify-between text-sm font-medium text-[#e3e3e3] mb-2">
                  <span>Uploading file...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="h-1.5 w-full bg-[#131314] rounded-full overflow-hidden">
                  <div className="h-full bg-[#a8c7fa] transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                </div>
              </div>
            )}

            {/* Inline New Folder Form */}
            {newFolderOpen && (
              <form onSubmit={handleCreateFolder} className="mb-6 flex items-center gap-3 bg-[#282a2c] border border-[#333537] rounded-lg p-3">
                <FolderIcon size={20} className="text-[#a8c7fa] fill-[#a8c7fa]" />
                <input
                  type="text"
                  required
                  autoFocus
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="Untitled folder"
                  className="bg-transparent border-none outline-none text-[#e3e3e3] text-sm flex-1"
                />
                <button
                  type="button"
                  onClick={() => setNewFolderOpen(false)}
                  className="text-sm font-medium text-[#c4c7c5] hover:text-[#e3e3e3] px-3 py-1.5 rounded hover:bg-[#333537] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="text-sm font-medium text-[#c2e7ff] hover:bg-[#a8c7fa]/10 px-4 py-1.5 rounded transition-colors"
                >
                  Create
                </button>
              </form>
            )}

            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleDirectUpload}
            />

            {/* Loading State */}
            {loading ? (
              <div className="flex items-center justify-center p-12 text-[#c4c7c5]">
                <RefreshCw size={24} className="animate-spin" />
              </div>
            ) : (folders.length === 0 && files.length === 0) ? (
              <div className="flex flex-col items-center justify-center p-24 text-center">
                <div className="w-48 h-48 mb-6 relative">
                  <div className="absolute inset-0 bg-[#282a2c] rounded-full opacity-50 blur-3xl"></div>
                  <FolderPlus size={100} className="text-[#333537] absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                </div>
                <h3 className="text-xl font-medium text-[#e3e3e3] mb-2">A place for all of your files</h3>
                <p className="text-sm text-[#c4c7c5]">Click 'New' to upload files or create folders.</p>
              </div>
            ) : (
              <div className="space-y-8">
                
                {/* Folders Grid */}
                {folders.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-[#e3e3e3] mb-4">Folders</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                      {folders.map((folder) => (
                        <div
                          key={folder.id}
                          className="group flex items-center justify-between p-3.5 bg-[#282a2c] hover:bg-[#333537] rounded-xl border border-transparent hover:border-white/10 transition-colors cursor-pointer select-none"
                        >
                          <div 
                            className="flex items-center gap-3 flex-1 overflow-hidden" 
                            onClick={() => navigateToFolder(folder)}
                          >
                            {/* Linux-style folder icon: bold, filled, blue */}
                            <FolderIcon size={24} className="text-[#a8c7fa] fill-[#a8c7fa] shrink-0" />
                            <span className="text-sm font-medium text-[#e3e3e3] truncate">{folder.name}</span>
                          </div>
                          
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteFolder(folder.id); }}
                            className="p-1.5 text-[#c4c7c5] opacity-0 group-hover:opacity-100 hover:bg-[#1e1f20] hover:text-red-400 rounded-full transition-all"
                            title="Delete folder"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Files List */}
                {files.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-[#e3e3e3] mb-4">Files</h3>
                    <div className="bg-[#1e1f20] rounded-xl overflow-hidden border border-[#333537]">
                      
                      {/* Table Header */}
                      <div className="grid grid-cols-12 px-4 py-3 border-b border-[#333537] text-xs font-medium text-[#c4c7c5]">
                        <div className="col-span-7 sm:col-span-8">Name</div>
                        <div className="col-span-3 sm:col-span-2">Size</div>
                        <div className="col-span-2 sm:col-span-2 text-right">Actions</div>
                      </div>

                      {/* Table Body */}
                      <div className="divide-y divide-[#333537]">
                        {files.map((file) => {
                          const Icon = getFileIcon(file.name);
                          return (
                            <div
                              key={file.id}
                              className="grid grid-cols-12 px-4 py-3 items-center hover:bg-[#333537]/50 transition-colors group cursor-default"
                            >
                              <div className="col-span-7 sm:col-span-8 flex items-center gap-3 truncate pr-4">
                                <Icon size={20} className="text-[#a8c7fa] shrink-0" />
                                <span className="text-sm font-medium text-[#e3e3e3] truncate">{file.name}</span>
                              </div>
                              
                              <div className="col-span-3 sm:col-span-2 text-xs text-[#c4c7c5]">
                                {formatBytes(file.size)}
                              </div>
                              
                              <div className="col-span-2 sm:col-span-2 flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => handleDownload(file.id)}
                                  className="p-2 text-[#c4c7c5] hover:text-[#e3e3e3] hover:bg-[#282a2c] rounded-full transition-colors"
                                  title="Download"
                                >
                                  <Download size={18} />
                                </button>
                                <button
                                  onClick={() => handleDeleteFile(file.id)}
                                  className="p-2 text-[#c4c7c5] hover:text-red-400 hover:bg-[#282a2c] rounded-full transition-colors"
                                  title="Delete"
                                >
                                  <Trash2 size={18} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
                
              </div>
            )}
          </div>
        </div>
      </main>
      
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
}
