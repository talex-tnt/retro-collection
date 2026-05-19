import type { Item } from '../api/firestore/services/public/userItems';
import ItemActions from './ItemActions';
import { useState } from 'react';
import {
  useGetPublicUserTagsQuery,
  useCreatePublicUserTagMutation,
} from '../api/firestore/firestoreApi';
import Tags from './Tags';
import { useUpdatePublicUserItemMutation } from '../api/firestore/firestoreApi';

interface ListItemProps {
  item: Item;
  editingItemId: string | null;
  editingField: 'name' | 'description' | null;
  editValue: string;
  startEditing: (
    itemId: string,
    field: 'name' | 'description',
    currentValue: string
  ) => void;
  saveEdit: (itemId: string) => void;
  cancelEdit: () => void;
  setEditValue: (value: string) => void;
  handleEditItem: (itemId: string, newName: string) => void;
  handleToggleItemVisibility: (
    itemId: string,
    currentVisibility: boolean
  ) => void;
    handleDeleteItem: (itemId: string) => void;
    showTags?: boolean;
}

function ListItem({
  item,
  editingItemId,
  editingField,
  editValue,
  startEditing,
  saveEdit,
  cancelEdit,
  setEditValue,
  handleEditItem,
  handleToggleItemVisibility,
  handleDeleteItem,
  showTags = true,
}: ListItemProps) {
  const [showAddTag, setShowAddTag] = useState(false);
  const userId = item.userId;
  const { data: userTags = [] } = useGetPublicUserTagsQuery(
    { userId },
    { skip: !userId }
  );
  const [createTag] = useCreatePublicUserTagMutation();
  const [updateItem] = useUpdatePublicUserItemMutation();

  const handleAddTag = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setAddTagError(null);
    const tag = newTag.trim();
    if (!tag) return;
    const tagExists = userTags.some(
      (t) => t.id.toLowerCase() === tag.toLowerCase()
    );
    try {
      if (!tagExists) {
        await createTag({ userId, tag }).unwrap();
      }
      // Add tag to item if not already present
      if (!item.tags?.includes(tag)) {
        await updateItem({
          id: item.id,
          userId,
          updates: { tags: [...(item.tags || []), tag] },
        }).unwrap();
      }
      setNewTag('');
      setShowAddTag(false);
    } catch (err: any) {
      setAddTagError(err?.message || 'Failed to add tag');
    }
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
          {editingItemId === item.id && editingField === 'name' ? (
            <input
              className="input input-sm input-bordered font-medium w-full max-w-xs"
              value={editValue}
              autoFocus
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={() => saveEdit(item.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveEdit(item.id);
                if (e.key === 'Escape') cancelEdit();
              }}
            />
          ) : (
            <p
              className="font-medium cursor-pointer hover:underline"
              onDoubleClick={() => startEditing(item.id, 'name', item.name)}
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
          onEdit={handleEditItem}
          onToggleVisibility={handleToggleItemVisibility}
          onDelete={handleDeleteItem}
        />
      </div>
      <div className="flex flex-row gap-4 justify-between items-start w-full">
        {/* Description (left) */}
        <div className="flex-1 min-w-0">
          {editingItemId === item.id && editingField === 'description' ? (
            <textarea
              className="textarea textarea-bordered textarea-sm w-full"
              value={editValue}
              autoFocus
              rows={2}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={() => saveEdit(item.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  saveEdit(item.id);
                }
                if (e.key === 'Escape') cancelEdit();
              }}
            />
          ) : item.description ? (
            <p
              className="text-sm text-base-content/80 whitespace-pre-wrap cursor-pointer hover:underline"
              onDoubleClick={() =>
                startEditing(item.id, 'description', item.description)
              }
              title="Double-click to edit description"
            >
              {item.description}
            </p>
          ) : (
            <p
              className="text-sm text-base-content/80 italic cursor-pointer hover:underline"
              onDoubleClick={() => startEditing(item.id, 'description', '')}
              title="Double-click to add description"
            >
              Add description...
            </p>
          )}
        </div>
        {/* End Description */}
      </div>
    </div>
  );
}

export default ListItem;
