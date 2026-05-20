import type { Item } from '../api/firestore/services/public/userItems';
import ItemActions from './ItemActions';
import { useState } from 'react';
import {
  useUpdatePublicUserItemMutation,
  useDeletePublicUserItemMutation,
} from '../api/firestore/firestoreApi';
import Tags from './Tags';
import DriveBrowser from './DriveBrowser';

interface ListItemProps {
  item: Item;
  userId: string;
  handleToggleItemVisibility: (
    itemId: string,
    currentVisibility: boolean
  ) => void;
  handleDeleteItem: (itemId: string) => void;
  showTags?: boolean;
}

function ListItem({
  item,
  userId,
  showTags = true,
  handleToggleItemVisibility,
  handleDeleteItem,
}: ListItemProps) {
  const [editingField, setEditingField] = useState<
    'name' | 'description' | null
  >(null);
  const [editValue, setEditValue] = useState('');
  const [editing, setEditing] = useState(false);
  const [updateItem] = useUpdatePublicUserItemMutation();
  const [deleteItem] = useDeletePublicUserItemMutation();

  const internalDeleteItem = async (itemId: string) => {
    if (!userId) return;
    try {
      await deleteItem({
        id: itemId,
        userId,
      }).unwrap();
    } catch (error) {
      console.error('Error deleting item:', error);
    }
    if (handleDeleteItem) handleDeleteItem(itemId);
  };

  const internalToggleItemVisibility = async (
    itemId: string,
    currentVisibility: boolean
  ) => {
    if (!userId) return;
    try {
      await updateItem({
        id: itemId,
        userId,
        updates: { visibility: { public: !currentVisibility } },
      }).unwrap();
    } catch (error) {
      console.error('Error toggling visibility:', error);
    }
    if (handleToggleItemVisibility)
      handleToggleItemVisibility(itemId, currentVisibility);
  };

  const startEditing = (
    field: 'name' | 'description',
    currentValue: string
  ) => {
    setEditingField(field);
    setEditValue(currentValue);
    setEditing(true);
  };

  const saveEdit = async () => {
    if (!editingField) return;
    const updates =
      editingField === 'name'
        ? { name: editValue.trim() }
        : { description: editValue };
    try {
      await updateItem({
        id: item.id,
        userId,
        updates,
      }).unwrap();
    } catch (error) {
      console.error('Error updating item:', error);
    }
    setEditing(false);
    setEditingField(null);
    setEditValue('');
  };

  const cancelEdit = () => {
    setEditing(false);
    setEditingField(null);
    setEditValue('');
  };

  const [showDrivePopup, setShowDrivePopup] = useState(false);
  const [selectedDriveFolder, setSelectedDriveFolder] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const handleDriveFolderSelect = (folder: { id: string; name: string }) => {
    setSelectedDriveFolder(folder);
    setShowDrivePopup(false);
  };
  return (
    <div
      key={item.id}
      className="flex flex-col gap-2 rounded-lg border border-base-300 bg-base-200 p-4"
    >
      {/* Google Drive Folder Picker */}
      <div className="flex flex-col gap-2">
        <button
          type="button"
          className="btn btn-outline btn-sm w-fit"
          onClick={() => setShowDrivePopup(true)}
        >
          {selectedDriveFolder
            ? 'Change Google Drive Folder'
            : 'Select Google Drive Folder'}
        </button>
        {selectedDriveFolder && (
          <span className="text-xs opacity-80">
            Selected: {selectedDriveFolder.name}
          </span>
        )}
      </div>

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

      {/* Tags at the top, toggleable */}
      {showTags && (
        <Tags userId={item.userId} itemId={item.id} tags={item.tags || []} />
      )}
      <div className="flex items-center gap-2">
        {editing && editingField === 'name' ? (
          <input
            className="input input-sm input-bordered font-medium w-full max-w-xs"
            value={editValue}
            autoFocus
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={saveEdit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveEdit();
              if (e.key === 'Escape') cancelEdit();
            }}
          />
        ) : (
          <p
            className="font-bold text-lg cursor-pointer hover:underline "
            onDoubleClick={() => startEditing('name', item.name)}
            title="Double-click to edit name"
          >
            {item.name}
          </p>
        )}
      </div>

      <div className="flex flex-row gap-4 justify-between items-start w-full">
        {/* Description (left) */}
        <div className="flex-1 min-w-0">
          {editing && editingField === 'description' ? (
            <textarea
              className="textarea textarea-bordered textarea-sm w-full"
              value={editValue}
              autoFocus
              rows={2}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={saveEdit}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  saveEdit();
                }
                if (e.key === 'Escape') cancelEdit();
              }}
            />
          ) : item.description ? (
            <p
              className="text-sm text-base-content/80 whitespace-pre-wrap cursor-pointer hover:underline"
              onDoubleClick={() =>
                startEditing('description', item.description || '')
              }
              title="Double-click to edit description"
            >
              {item.description}
            </p>
          ) : (
            <p
              className="text-sm text-base-content/80 italic cursor-pointer hover:underline"
              onDoubleClick={() => startEditing('description', '')}
              title="Double-click to add description"
            >
              Add description...
            </p>
          )}
        </div>
        {/* End Description */}
      </div>

      {/* Visibility, dates, and actions row */}
      <div className="flex flex-row gap-4 items-center text-xs text-base-content/60 justify-between w-full mt-1">
        <div className="flex flex-row gap-4 items-center">
          <span>
            Visibility:{' '}
            <span
              className={
                item.visibility?.public ? 'text-green-600' : 'text-yellow-600'
              }
            >
              {item.visibility?.public ? 'Public' : 'Private'}
            </span>
          </span>
          {item.createdAt && (
            <span>Created: {new Date(item.createdAt).toLocaleString()}</span>
          )}
          {item.updatedAt && (
            <span>Edited: {new Date(item.updatedAt).toLocaleString()}</span>
          )}
        </div>
        <div className="flex flex-row items-center">
          <ItemActions
            itemId={item.id}
            isPublic={!!item.visibility?.public}
            onEdit={() => startEditing('name', item.name)}
            onToggleVisibility={internalToggleItemVisibility}
            onDelete={internalDeleteItem}
          />
        </div>
      </div>
    </div>
  );
}

export default ListItem;
