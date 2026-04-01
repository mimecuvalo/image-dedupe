import { convertFileSrc } from "@tauri-apps/api/core";
import type { ImageInfo } from "../types";

interface PreviewPanelProps {
  image: ImageInfo;
  isMarked: boolean;
  onToggle: (id: string) => void;
  onClose: () => void;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function PreviewPanel({
  image,
  isMarked,
  onToggle,
  onClose,
}: PreviewPanelProps) {
  const fullSrc = convertFileSrc(image.path);

  return (
    <div className="flex flex-col h-full bg-white border-l border-gray-200">
      {/* Panel header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 shrink-0">
        <h3 className="text-sm font-medium text-gray-900 truncate" title={image.filename}>
          {image.filename}
        </h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer ml-2 shrink-0"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
          </svg>
        </button>
      </div>

      {/* Image preview */}
      <div className="flex-1 min-h-0 bg-gray-950 flex items-center justify-center p-4">
        <img
          src={fullSrc}
          alt={image.filename}
          className="max-w-full max-h-full object-contain"
        />
      </div>

      {/* Metadata + actions */}
      <div className="px-4 py-3 border-t border-gray-200 shrink-0 space-y-3">
        <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
          <div>
            <span className="text-gray-400">Dimensions</span>
            <p className="font-medium text-gray-900">
              {image.width} x {image.height}
            </p>
          </div>
          <div>
            <span className="text-gray-400">Size</span>
            <p className="font-medium text-gray-900">
              {formatSize(image.sizeBytes)}
            </p>
          </div>
        </div>
        <p className="text-xs text-gray-400 truncate" title={image.path}>
          {image.path}
        </p>
        <button
          onClick={() => onToggle(image.id)}
          className={`w-full py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer
            ${
              isMarked
                ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                : "bg-red-600 text-white hover:bg-red-700"
            }`}
        >
          {isMarked ? "Unmark for Deletion" : "Mark for Deletion"}
        </button>
      </div>
    </div>
  );
}
