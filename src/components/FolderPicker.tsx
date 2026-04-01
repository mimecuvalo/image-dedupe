import { open } from "@tauri-apps/plugin-dialog";

interface FolderPickerProps {
  onSelect: (path: string) => void;
  disabled?: boolean;
}

export function FolderPicker({ onSelect, disabled }: FolderPickerProps) {
  const handleClick = async () => {
    const selected = await open({ directory: true, multiple: false });
    if (selected) {
      onSelect(selected);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium
                 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50
                 disabled:cursor-not-allowed transition-colors cursor-pointer"
    >
      Select Folder
    </button>
  );
}
