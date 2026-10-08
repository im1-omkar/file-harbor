import { X, Download } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../services/api";

interface FileViewerModalProps {
  file: { id: string; name: string; size: string | number } | null;
  onClose: () => void;
  onDownload: (fileId: string) => void;
}

export function FileViewerModal({ file, onClose, onDownload }: FileViewerModalProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setUrl(null);
      setTextContent(null);
      setError(null);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    api.getDownloadUrl(file.id).then(({ downloadUrl }) => {
      if (!isMounted) return;
      setUrl(downloadUrl);
      
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      const isText = ['txt', 'md', 'json', 'csv', 'js', 'ts', 'jsx', 'tsx', 'html', 'css'].includes(ext);

      if (isText) {
        fetch(downloadUrl)
          .then(res => res.text())
          .then(text => {
            if (isMounted) setTextContent(text);
          })
          .catch(() => {
            if (isMounted) setError("Failed to load text content");
          })
          .finally(() => {
            if (isMounted) setLoading(false);
          });
      } else {
        setLoading(false);
      }
    }).catch(err => {
      if (isMounted) {
        setError(err.message || "Failed to get file URL");
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [file]);

  if (!file) return null;

  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  const isImage = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(ext);
  const isVideo = ['mp4', 'webm', 'ogg'].includes(ext);
  const isAudio = ['mp3', 'wav', 'ogg'].includes(ext);
  const isText = ['txt', 'md', 'json', 'csv', 'js', 'ts', 'jsx', 'tsx', 'html', 'css'].includes(ext);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 md:p-8">
      <div className="bg-[#1e1f20] w-full max-w-5xl h-full max-h-[90vh] rounded-2xl border border-[#333537] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#333537] bg-[#1e1f20]">
          <h3 className="text-[#e3e3e3] font-medium truncate pr-4">{file.name}</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onDownload(file.id)}
              className="p-2 text-[#c4c7c5] hover:text-[#e3e3e3] hover:bg-[#333537] rounded-full transition-colors"
              title="Download"
            >
              <Download size={20} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-[#c4c7c5] hover:text-[#e3e3e3] hover:bg-[#333537] rounded-full transition-colors"
              title="Close"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto bg-[#131314] flex items-center justify-center relative p-4">
          {loading && !url && (
            <div className="text-[#c4c7c5]">Loading file...</div>
          )}
          {error && (
            <div className="text-red-400 bg-red-900/20 px-4 py-2 rounded-lg border border-red-900/50">
              {error}
            </div>
          )}
          
          {!loading && url && !error && (
            <>
              {isImage && (
                <img src={url} alt={file.name} className="max-w-full max-h-full object-contain rounded" />
              )}
              {isVideo && (
                <video src={url} controls className="max-w-full max-h-full rounded outline-none" />
              )}
              {isAudio && (
                <audio src={url} controls className="w-full max-w-md outline-none" />
              )}
              {isText && textContent !== null && (
                <div className="w-full h-full text-left overflow-auto bg-[#1e1f20] p-4 rounded-lg font-mono text-sm text-[#e3e3e3] whitespace-pre-wrap">
                  {textContent}
                </div>
              )}
              {!isImage && !isVideo && !isAudio && !isText && (
                <div className="flex flex-col items-center justify-center text-[#c4c7c5]">
                  <p className="mb-4">No preview available for this file type.</p>
                  <button
                    onClick={() => onDownload(file.id)}
                    className="flex items-center gap-2 bg-[#c2e7ff] text-[#001d35] px-4 py-2 rounded-lg font-medium hover:bg-[#a8c7fa] transition-colors"
                  >
                    <Download size={18} /> Download to view
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
