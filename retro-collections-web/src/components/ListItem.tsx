import type { Item } from '../api/firestore/services/public/userItems';
import ItemActions from './ItemActions';
import { useState } from 'react';
import {
  useGetPublicUserTagsQuery,
  useCreatePublicUserTagMutation,
} from '../api/firestore/firestoreApi';
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
}: ListItemProps) {
  const [newTag, setNewTag] = useState('');
  const [addTagError, setAddTagError] = useState<string | null>(null);
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
      <div className="flex items-center justify-between gap-2">
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
        {/* Description & Tags (left) */}
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
        {/* Tags UI */}
        <div className="mt-2">
          <div className="flex flex-wrap gap-2 mb-2">
            {item.tags && item.tags.length > 0 ? (
              item.tags.map((tag) => (
                <span key={tag} className="badge badge-outline">
                  {tag}
                </span>
              ))
            ) : (
              <span className="text-xs text-base-content/50 italic">
                No tags
              </span>
            )}
            <button
              type="button"
              className="btn btn-xs btn-circle btn-outline flex items-center justify-center"
              aria-label="Add tag"
              onClick={() => setShowAddTag(true)}
              tabIndex={0}
            >
              <span className="text-lg leading-none">+</span>
            </button>
          </div>
          {showAddTag && (
            <form
              className="flex gap-2 mt-1"
              onSubmit={handleAddTag}
              tabIndex={-1}
            >
              <input
                type="text"
                className="input input-xs input-bordered"
                placeholder="Add tag"
                value={newTag}
                autoFocus
                onChange={(e) => setNewTag(e.target.value)}
                onBlur={(e) => {
                  setTimeout(() => setShowAddTag(false), 100);
                }}
                list={`tag-suggestions-${item.id}`}
              />
              <datalist id={`tag-suggestions-${item.id}`}>
                {userTags.map((t) => (
                  <option key={t.id} value={t.id} />
                ))}
              </datalist>
              <button type="submit" className="btn btn-xs btn-primary">
                Add
              </button>
            </form>
          )}
          {addTagError && (
            <div className="text-xs text-error mt-1">{addTagError}</div>
          )}
          <p className="text-xs text-base-content/70 mt-2">
            {item.createdAt
              ? `Added ${new Date(item.createdAt).toLocaleString()}`
              : 'No timestamp'}
          </p>
          <p
            className="text-xs text-base-content/70 cursor-pointer hover:underline"
            title="Double-click to toggle visibility"
            onDoubleClick={() =>
              handleToggleItemVisibility(item.id, !!item.visibility?.public)
            }
          >
            Visibility: {item.visibility?.public ? 'Public' : 'Private'}
          </p>
        </div>
      </div>
    </div>
  );
}

export default ListItem;
