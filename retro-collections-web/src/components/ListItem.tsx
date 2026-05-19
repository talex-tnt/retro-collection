import type { Item } from '../api/firestore/services/public/userItems';
import ItemActions from './ItemActions';
import { useState } from 'react';
import {
  useUpdatePublicUserItemMutation,
  useDeletePublicUserItemMutation,
} from '../api/firestore/firestoreApi';
import Tags from './Tags';

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

function ListItem({ item, userId, showTags = true }: ListItemProps) {
  const [editingField, setEditingField] = useState<
    'name' | 'description' | null
  >(null);
  const [editValue, setEditValue] = useState('');
  const [editing, setEditing] = useState(false);
  const [updateItem] = useUpdatePublicUserItemMutation();
  const [deleteItem] = useDeletePublicUserItemMutation();

  const handleDeleteItem = async (itemId: string) => {
    if (!userId) return;
    try {
      await deleteItem({
        id: itemId,
        userId,
      }).unwrap();
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  };

  const handleToggleItemVisibility = async (
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
  return (
    <div
      key={item.id}
      className="flex flex-col gap-2 rounded-lg border border-base-300 bg-base-200 p-4"
    >
      {/* Tags at the top, toggleable */}
      {showTags && (
        <Tags userId={item.userId} itemId={item.id} tags={item.tags || []} />
      )}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
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
              className="font-medium cursor-pointer hover:underline"
              onDoubleClick={() => startEditing('name', item.name)}
              title="Double-click to edit name"
            >
              {item.name}
            </p>
          )}
        </div>
        <ItemActions
          itemId={item.id}
          itemName={item.name}
          isPublic={!!item.visibility?.public}
          onEdit={() => startEditing('name', item.name)}
          onToggleVisibility={handleToggleItemVisibility}
          onDelete={handleDeleteItem}
        />
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

      {/* Visibility and dates row */}
      <div className="flex flex-row gap-4 items-center text-xs text-base-content/60">
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
    </div>
  );
}

export default ListItem;
