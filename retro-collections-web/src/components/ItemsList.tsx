import { useState } from 'react';
import {
  useGetPublicUserItemsQuery,
  useUpdatePublicUserItemMutation,
  useDeletePublicUserItemMutation,
} from '../api/firestore/firestoreApi';

import ItemActions from './ItemActions';
import ListItem from './ListItem';

interface ItemsListProps {
  user: { uid: string } | null;
  itemFilter: string;
  onItemFilterChange: (filter: string) => void;
}

function ItemsList({ user, itemFilter, onItemFilterChange }: ItemsListProps) {
  // Local state for editing
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<'name' | 'description' | null>(null);
  const [editValue, setEditValue] = useState('');
  const [showTags, setShowTags] = useState(true);

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
        <div className="flex items-center justify-between">
          <h2 className="card-title">My Collectibles</h2>
          <button
            className="btn btn-sm btn-outline"
            onClick={() => setShowTags((v) => !v)}
          >
            {showTags ? 'Hide Tags' : 'Show Tags'}
          </button>
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
              <ListItem
                key={item.id}
                item={item}
                user={user}
                editingItemId={editingItemId}
                editingField={editingField}
                editValue={editValue}
                startEditing={startEditing}
                saveEdit={saveEdit}
                cancelEdit={cancelEdit}
                setEditValue={setEditValue}
                handleEditItem={handleEditItem}
                handleToggleItemVisibility={handleToggleItemVisibility}
                handleDeleteItem={handleDeleteItem}
                showTags={showTags}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default ItemsList;
