import { useState } from 'react';
import {
  FiEdit2,
  FiEye,
  FiEyeOff,
  FiTrash2,
  FiFolderPlus,
} from 'react-icons/fi';
import DriveBrowser from './DriveBrowser';

interface ItemActionsProps {
  itemId: string;
  isPublic: boolean;
  onEdit: () => void;
  onToggleVisibility: (itemId: string, currentVisibility: boolean) => void;
  onDelete: (itemId: string) => void;
  onImageFolderSelect: ({
    folder,
    files,
  }: {
    folder: { id: string; name: string };
    files: { id: string; name: string; mimeType?: string }[];
  }) => void;
  imageFolder?: { id: string; name: string };
}

function ItemActions({
  itemId,
  isPublic,
  onEdit,
  onToggleVisibility,
  onDelete,
  onImageFolderSelect,
  imageFolder,
}: ItemActionsProps) {
  const [showDrivePopup, setShowDrivePopup] = useState(false);

  const selectedDriveFolder = imageFolder;
  const setSelectedDriveFolder = onImageFolderSelect;

  const handleDriveFolderSelect = ({
    folder,
    files,
  }: {
    folder: { id: string; name: string };
    files: { id: string; name: string; mimeType?: string }[];
  }) => {
    setSelectedDriveFolder({ folder, files });
    setShowDrivePopup(false);
  };
  return (
    <div className="flex gap-2">
      {/* DriveBrowser Popup */}
      {showDrivePopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-base-100 rounded-lg shadow-lg p-6 relative min-w-[320px] max-w-[90vw] max-h-[80vh] overflow-auto">
            <button
              className="absolute top-2 right-2 btn btn-xs btn-circle"
              onClick={() => setShowDrivePopup(false)}
              aria-label="Close"
            >
              ✕
            </button>
            <DriveBrowser onSelectFolder={handleDriveFolderSelect} />
          </div>
        </div>
      )}

      {/* Google Drive Folder Picker */}
      <div className="flex gap-0">
        {selectedDriveFolder && (
          <div className="flex items-center gap-1 bg-base-200 rounded py-1">
            <span className="text-xs opacity-80">
              {selectedDriveFolder.name}
            </span>
          </div>
        )}
        <button
          type="button"
          data-tip="Select Google Drive folder with images"
          className="btn btn-sm btn-ghost text-error hover:text-error tooltip"
          onClick={() => setShowDrivePopup(true)}
        >
          {selectedDriveFolder ? (
            <FiFolderPlus fill="currentColor" size={18} />
          ) : (
            <FiFolderPlus size={18} />
          )}
        </button>
      </div>

      <button
        className="btn btn-sm btn-ghost tooltip"
        data-tip="Edit collectible"
        onClick={onEdit}
        title="Edit collectible"
      >
        <FiEdit2 size={18} />
      </button>
      <button
        className="btn btn-sm btn-ghost tooltip"
        data-tip={isPublic ? 'Make Private' : 'Make Public'}
        onClick={() => onToggleVisibility(itemId, isPublic)}
        title={isPublic ? 'Make Private' : 'Make Public'}
      >
        {isPublic ? <FiEyeOff size={18} /> : <FiEye size={18} />}
      </button>
      <button
        className="btn btn-sm btn-ghost text-error hover:text-error tooltip"
        data-tip="Delete collectible"
        onClick={() => onDelete(itemId)}
        title="Delete collectible"
      >
        <FiTrash2 size={18} />
      </button>
    </div>
  );
}

export default ItemActions;
