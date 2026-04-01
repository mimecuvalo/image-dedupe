import type { ImageInfo } from "../types";

interface ConfirmDeleteDialogProps {
  images: ImageInfo[];
  onConfirm: (toTrash: boolean) => void;
  onCancel: () => void;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ConfirmDeleteDialog({
  images,
  onConfirm,
  onCancel,
}: ConfirmDeleteDialogProps) {
  const totalSize = images.reduce((sum, img) => sum + img.sizeBytes, 0);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">
          Delete {images.length} image{images.length !== 1 ? "s" : ""}?
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          This will free up {formatSize(totalSize)} of space.
        </p>
        <div className="max-h-40 overflow-y-auto mb-4 text-xs text-gray-500 space-y-1">
          {images.map((img) => (
            <div key={img.id} className="truncate" title={img.path}>
              {img.filename}
            </div>
          ))}
        </div>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200
                       rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(true)}
            className="px-4 py-2 text-sm text-white bg-orange-500 hover:bg-orange-600
                       rounded-lg transition-colors cursor-pointer"
          >
            Move to Trash
          </button>
          <button
            onClick={() => onConfirm(false)}
            className="px-4 py-2 text-sm text-white bg-red-600 hover:bg-red-700
                       rounded-lg transition-colors cursor-pointer"
          >
            Delete Permanently
          </button>
        </div>
      </div>
    </div>
  );
}
