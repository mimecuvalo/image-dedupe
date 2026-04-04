import { convertFileSrc } from "@tauri-apps/api/core";
import type { ImageInfo } from "../types";

interface ImageCardProps {
  image: ImageInfo;
  selected: boolean;
  previewing: boolean;
  onToggle: (id: string) => void;
  onPreview: (image: ImageInfo) => void;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ImageCard({
  image,
  selected,
  previewing,
  onToggle,
  onPreview,
}: ImageCardProps) {
  const thumbSrc = image.thumbnailPath
    ? convertFileSrc(image.thumbnailPath)
    : "";

  return (
    <div
      className={`relative rounded-lg border-2 overflow-hidden transition-all cursor-pointer w-44
        ${previewing ? "border-blue-500 ring-2 ring-blue-300" : selected ? "border-red-500 opacity-60" : "border-gray-200 hover:border-blue-400"}`}
      onClick={() => onPreview(image)}
    >
      {selected && (
        <div className="absolute inset-0 bg-red-500/10 z-10 flex items-center justify-center pointer-events-none">
          <span className="text-red-600 font-bold text-sm bg-white/80 px-2 py-1 rounded">
            DELETE
          </span>
        </div>
      )}
      <div className="h-40 bg-gray-100 flex items-center justify-center overflow-hidden">
        {thumbSrc ? (
          <img
            src={thumbSrc}
            alt={image.filename}
            className="max-w-full max-h-full object-contain"
            loading="lazy"
          />
        ) : (
          <span className="text-gray-400 text-xs">No preview</span>
        )}
      </div>
      <div className="p-2 text-xs space-y-0.5">
        <p className="font-medium truncate" title={image.filename}>
          {image.filename}
        </p>
        <p className="text-gray-500">
          {image.width}x{image.height} &middot; {formatSize(image.sizeBytes)}
        </p>
      </div>
      <div className="absolute top-2 right-2 z-20">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggle(image.id)}
          onClick={(e) => e.stopPropagation()}
          className="w-4 h-4 accent-red-500 cursor-pointer"
        />
      </div>
    </div>
  );
}
