import { useState } from 'react';
import {
  useGetPublicUserItemsQuery,
  useUpdatePublicUserItemMutation,
  useDeletePublicUserItemMutation,
} from '../api/firestore/firestoreApi';

import ItemActions from './ItemActions';

interface ItemsListProps {
  user: { uid: string } | null;
  itemFilter: string;
  onItemFilterChange: (filter: string) => void;
}

function ItemsList({ user, itemFilter, onItemFilterChange }: ItemsListProps) {
  // Local state for editing
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<
    'name' | 'description' | null
  >(null);
  const [editValue, setEditValue] = useState('');

  // Start editing handler
  const startEditing = (
    itemId: string,
    field: 'name' | 'description',
    currentValue: string
  ) => {
    setEditingItemId(itemId);
    setEditingField(field);
    setEditValue(currentValue);
  };

  // Save edit handler
  const saveEdit = async (itemId: string) => {
    if (!user || !editingField) return;
    const updates =
      editingField === 'name'
        ? { name: editValue.trim() }
        : { description: editValue };
    try {
      await updateItem({
        id: itemId,
        userId: user.uid,
        updates,
      }).unwrap();
    } catch (error) {
      console.error('Error updating item:', error);
    }
    setEditingItemId(null);
    setEditingField(null);
    setEditValue('');
  };

  // Cancel edit
  const cancelEdit = () => {
    setEditingItemId(null);
    setEditingField(null);
    setEditValue('');
  };
  const {
    data: items = [],
    isLoading: loadingItems,
    error: itemsError,
  } = useGetPublicUserItemsQuery(
    { userId: user?.uid || '' },
    { skip: !user?.uid }
  );

  const [updateItem] = useUpdatePublicUserItemMutation();
  const [deleteItem] = useDeletePublicUserItemMutation();

  const handleEditItem = async (itemId: string, newName: string) => {
    if (!user || !newName.trim()) return;

    try {
      await updateItem({
        id: itemId,
        userId: user.uid,
        updates: { name: newName.trim() },
      }).unwrap();
    } catch (error) {
      console.error('Error updating item:', error);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!user) return;
    try {
      await deleteItem({
        id: itemId,
        userId: user.uid,
      }).unwrap();
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  };

  const handleToggleItemVisibility = async (
    itemId: string,
    currentVisibility: boolean
  ) => {
    if (!user) return;

    try {
      await updateItem({
        id: itemId,
        userId: user.uid,
        updates: { visibility: { public: !currentVisibility } },
      }).unwrap();
    } catch (error) {
      console.error('Error toggling visibility:', error);
    }
  };

  // Filter items by name
  const filteredItems = items.filter((item) =>
    item.name.toLowerCase().includes(itemFilter.toLowerCase())
  );

  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body space-y-4">
        {/* Items Header */}
        <div>
          <h2 className="card-title">My Collectibles</h2>
        </div>

        {/* Filter Input */}
        <div>
          <input
            type="text"
            className="input input-bordered w-full"
            value={itemFilter}
            onChange={(e) => onItemFilterChange(e.target.value)}
            placeholder="Filter items by name..."
          />
        </div>

        {/* Items List */}
        <div className="space-y-3">
          {itemsError ? (
            <div className="alert alert-error">
              <span>
                Error loading collectibles:{' '}
                {(itemsError as Error).message || 'Unknown error'}
              </span>
            </div>
          ) : loadingItems ? (
            <div className="alert alert-info">Loading collectibles...</div>
          ) : filteredItems.length === 0 ? (
            <div className="alert alert-info">
              {itemFilter
                ? 'No collectibles match your filter.'
                : 'No collectibles yet.'}
            </div>
          ) : (
            filteredItems.map((item) => (
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
                      onDoubleClick={() =>
                        startEditing(item.id, 'name', item.name)
                      }
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
                        onDoubleClick={() =>
                          startEditing(item.id, 'description', '')
                        }
                        title="Double-click to add description"
                      >
                        Add description...
                      </p>
                    )}
                  </div>
                  {/* Meta info (right, below actions) */}
                  <div className="flex flex-col items-end flex-shrink-0 text-right gap-1 min-w-[140px] ml-2">
                    <p className="text-xs text-base-content/70">
                      {item.createdAt
                        ? `Added ${new Date(item.createdAt).toLocaleString()}`
                        : 'No timestamp'}
                    </p>
                    <p
                      className="text-xs text-base-content/70 cursor-pointer hover:underline"
                      title="Double-click to toggle visibility"
                      onDoubleClick={() =>
                        handleToggleItemVisibility(
                          item.id,
                          !!item.visibility?.public
                        )
                      }
                    >
                      Visibility: {item.visibility?.public ? 'Public' : 'Private'}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default ItemsList;
