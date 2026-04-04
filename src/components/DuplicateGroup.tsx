import type { DuplicateGroup as DuplicateGroupType, ImageInfo } from "../types";
import { ImageCard } from "./ImageCard";

interface DuplicateGroupProps {
  group: DuplicateGroupType;
  markedIds: Set<string>;
  previewingId: string | null;
  onToggle: (id: string) => void;
  onPreview: (image: ImageInfo) => void;
  onKeepBest: (group: DuplicateGroupType) => void;
}

export function DuplicateGroup({
  group,
  markedIds,
  previewingId,
  onToggle,
  onPreview,
  onKeepBest,
}: DuplicateGroupProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm text-gray-600">
          <span className="font-medium text-gray-900">
            {group.images.length} duplicates
          </span>
          {" \u00b7 "}
          {Math.round(group.similarityScore * 100)}% similar
        </div>
        <button
          onClick={() => onKeepBest(group)}
          className="text-xs px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-md
                     text-gray-700 transition-colors cursor-pointer"
        >
          Keep best
        </button>
      </div>
      <div className="flex flex-wrap gap-3">
        {group.images.map((image) => (
          <ImageCard
            key={image.id}
            image={image}
            selected={markedIds.has(image.id)}
            previewing={previewingId === image.id}
            onToggle={onToggle}
            onPreview={onPreview}
          />
        ))}
      </div>
    </div>
  );
}
