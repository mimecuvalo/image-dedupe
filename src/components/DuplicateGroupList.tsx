import type { DuplicateGroup as DuplicateGroupType, ImageInfo } from "../types";
import { DuplicateGroup } from "./DuplicateGroup";

interface DuplicateGroupListProps {
  groups: DuplicateGroupType[];
  markedIds: Set<string>;
  previewingId: string | null;
  onToggle: (id: string) => void;
  onPreview: (image: ImageInfo) => void;
  onKeepBest: (group: DuplicateGroupType) => void;
}

export function DuplicateGroupList({
  groups,
  markedIds,
  previewingId,
  onToggle,
  onPreview,
  onKeepBest,
}: DuplicateGroupListProps) {
  if (groups.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        No duplicate images found.
      </div>
    );
  }

  return (
    <div>
      {groups.map((group) => (
        <DuplicateGroup
          key={group.groupId}
          group={group}
          markedIds={markedIds}
          previewingId={previewingId}
          onToggle={onToggle}
          onPreview={onPreview}
          onKeepBest={onKeepBest}
        />
      ))}
    </div>
  );
}
