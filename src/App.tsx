import { useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useScan } from "./hooks/useScan";
import { FolderPicker } from "./components/FolderPicker";
import { ScanProgress } from "./components/ScanProgress";
import { DuplicateGroupList } from "./components/DuplicateGroupList";
import { PreviewPanel } from "./components/PreviewPanel";
import { ResizeHandle } from "./components/ResizeHandle";
import { ConfirmDeleteDialog } from "./components/ConfirmDeleteDialog";
import type { DuplicateGroup, ImageInfo } from "./types";

const PREVIEW_MIN_WIDTH = 300;
const PREVIEW_MAX_WIDTH = 1200;
const PREVIEW_DEFAULT_WIDTH = 600;

function App() {
  const { phase, progress, duplicateGroups, error, startScan, reset } =
    useScan();
  const [folderPath, setFolderPath] = useState<string | null>(null);
  const [markedIds, setMarkedIds] = useState<Set<string>>(new Set());
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [previewImage, setPreviewImage] = useState<ImageInfo | null>(null);
  const [previewWidth, setPreviewWidth] = useState(PREVIEW_DEFAULT_WIDTH);

  const handleResize = useCallback((delta: number) => {
    setPreviewWidth((w) =>
      Math.min(PREVIEW_MAX_WIDTH, Math.max(PREVIEW_MIN_WIDTH, w + delta))
    );
  }, []);

  const isScanning =
    phase === "discovering" ||
    phase === "thumbnails" ||
    phase === "hashing" ||
    phase === "comparing";

  const handleFolderSelect = useCallback(
    (path: string) => {
      setFolderPath(path);
      setMarkedIds(new Set());
      setPreviewImage(null);
      startScan(path);
    },
    [startScan]
  );

  const handleToggle = useCallback((id: string) => {
    setMarkedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleKeepBest = useCallback((group: DuplicateGroup) => {
    const sorted = [...group.images].sort(
      (a, b) => b.width * b.height - a.width * a.height
    );
    const toDelete = sorted.slice(1).map((img) => img.id);
    setMarkedIds((prev) => {
      const next = new Set(prev);
      toDelete.forEach((id) => next.add(id));
      return next;
    });
  }, []);

  const handlePreview = useCallback((image: ImageInfo) => {
    setPreviewImage((prev) => (prev?.id === image.id ? null : image));
  }, []);

  const markedImages: ImageInfo[] = duplicateGroups
    .flatMap((g) => g.images)
    .filter((img) => markedIds.has(img.id));

  const handleDelete = useCallback(
    async (toTrash: boolean) => {
      const paths = markedImages.map((img) => img.path);
      try {
        await invoke("delete_images", { paths, toTrash });
        setMarkedIds(new Set());
        setShowDeleteDialog(false);
        setPreviewImage(null);
        if (folderPath) {
          startScan(folderPath);
        }
      } catch (err) {
        console.error("Failed to delete:", err);
        setShowDeleteDialog(false);
      }
    },
    [markedImages, folderPath, startScan]
  );

  const showPreview = previewImage !== null && phase === "complete";

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shrink-0 z-30">
        <div className="px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Image Dedupe</h1>
          <div className="flex items-center gap-3">
            {folderPath && (
              <span className="text-sm text-gray-500 truncate max-w-xs">
                {folderPath}
              </span>
            )}
            <FolderPicker onSelect={handleFolderSelect} disabled={isScanning} />
            {phase === "complete" && (
              <button
                onClick={() => {
                  reset();
                  setPreviewImage(null);
                }}
                className="px-4 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200
                           rounded-lg transition-colors cursor-pointer"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main content area */}
      <div className="flex-1 min-h-0 flex">
        {/* Left: group list */}
        <div
          className={`flex-1 min-w-0 overflow-y-auto ${showPreview ? "" : ""}`}
        >
          <div className="p-4">
            {/* Idle state */}
            {phase === "idle" && (
              <div className="text-center py-24">
                <div className="text-6xl mb-4">&#128444;</div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                  Find Duplicate Images
                </h2>
                <p className="text-gray-500 mb-6">
                  Select a folder to scan for duplicate and similar images.
                </p>
                <FolderPicker onSelect={handleFolderSelect} />
              </div>
            )}

            {/* Scanning progress */}
            {isScanning && (
              <div className="flex flex-col items-center py-24 gap-4">
                <div className="text-4xl animate-pulse">&#128269;</div>
                <ScanProgress
                  phase={phase}
                  processed={progress.processed}
                  total={progress.total}
                />
              </div>
            )}

            {/* Error */}
            {phase === "error" && (
              <div className="text-center py-24">
                <div className="text-4xl mb-4">&#9888;&#65039;</div>
                <p className="text-red-600 mb-4">{error}</p>
                <FolderPicker onSelect={handleFolderSelect} />
              </div>
            )}

            {/* Results */}
            {phase === "complete" && (
              <>
                <div className="mb-4 text-sm text-gray-600">
                  Found {duplicateGroups.length} group
                  {duplicateGroups.length !== 1 ? "s" : ""} of similar images
                </div>
                <DuplicateGroupList
                  groups={duplicateGroups}
                  markedIds={markedIds}
                  previewingId={previewImage?.id ?? null}
                  onToggle={handleToggle}
                  onPreview={handlePreview}
                  onKeepBest={handleKeepBest}
                />
              </>
            )}
          </div>

          {/* Delete footer spacer */}
          {markedIds.size > 0 && phase === "complete" && (
            <div className="h-16" />
          )}
        </div>

        {/* Resize handle + preview panel */}
        {showPreview && (
          <>
            <ResizeHandle onResize={handleResize} />
            <div className="shrink-0 h-full" style={{ width: previewWidth }}>
              <PreviewPanel
                image={previewImage}
                isMarked={markedIds.has(previewImage.id)}
                onToggle={handleToggle}
                onClose={() => setPreviewImage(null)}
              />
            </div>
          </>
        )}
      </div>

      {/* Delete footer */}
      {markedIds.size > 0 && phase === "complete" && (
        <div className="bg-white border-t border-gray-200 shadow-lg shrink-0 z-30">
          <div className="px-4 py-3 flex items-center justify-between">
            <span className="text-sm text-gray-700">
              {markedIds.size} image{markedIds.size !== 1 ? "s" : ""} selected
              for deletion
            </span>
            <div className="flex gap-3">
              <button
                onClick={() => setMarkedIds(new Set())}
                className="px-4 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200
                           rounded-lg transition-colors cursor-pointer"
              >
                Clear Selection
              </button>
              <button
                onClick={() => setShowDeleteDialog(true)}
                className="px-4 py-2 text-sm text-white bg-red-600 hover:bg-red-700
                           rounded-lg transition-colors cursor-pointer"
              >
                Delete Selected
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation dialog */}
      {showDeleteDialog && (
        <ConfirmDeleteDialog
          images={markedImages}
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteDialog(false)}
        />
      )}
    </div>
  );
}

export default App;
