import { useEffect, useState } from 'react';
import { useCreateItemMutation } from '../api/firestore/firestoreApi';

interface CollectionRecord {
  id: string;
  name: string;
  createdAt: string;
}

type SelectedCollection =
  | CollectionRecord
  | { id: 'orphaned'; name: 'Orphaned Items'; createdAt: '' };

interface NewItemProps {
  userId: string;
  collections: CollectionRecord[];
  selectedCollection: SelectedCollection | null;
}

function NewItem({ userId, collections, selectedCollection }: NewItemProps) {
  const [collectionId, setCollectionId] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const [createItem, { isLoading: isCreatingItem }] = useCreateItemMutation();

  useEffect(() => {
    if (selectedCollection?.id && selectedCollection.id !== 'orphaned') {
      setCollectionId(selectedCollection.id);
      return;
    }

    if (selectedCollection?.id === 'orphaned') {
      setCollectionId('');
      return;
    }

    setCollectionId((currentCollectionId) => {
      if (
        currentCollectionId &&
        collections.some((collection) => collection.id === currentCollectionId)
      ) {
        return currentCollectionId;
      }

      return collections[0]?.id ?? '';
    });
  }, [collections, selectedCollection]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!name.trim()) {
      return;
    }

    try {
      const itemData: Record<string, unknown> = {
        name: name.trim(),
        userId,
        visibility: { public: false },
      };

      if (description.trim()) {
        itemData.description = description.trim();
      }

      if (collectionId) {
        itemData.collectionId = collectionId;
      }

      await createItem(itemData as Parameters<typeof createItem>[0]).unwrap();

      setName('');
      setDescription('');
    } catch (error) {
      console.error('Error adding item:', error);
    }
  };

  return (
    <div className="card bg-base-100 shadow-xl h-fit">
      <div className="card-body space-y-4">
        <div>
          <h2 className="card-title text-lg">New Item</h2>
          <p className="text-sm text-base-content/70">
            Choose a collection or leave it unassigned to create an orphaned
            item.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,220px)_1fr]">
            <label className="form-control w-full">
              <span className="label-text mb-1">Collection</span>
              <select
                className="select select-bordered w-full"
                value={collectionId}
                onChange={(event) => setCollectionId(event.target.value)}
                disabled={isCreatingItem}
              >
                <option value="">No collection</option>
                {collections.map((collection) => (
                  <option key={collection.id} value={collection.id}>
                    {collection.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="form-control w-full">
              <span className="label-text mb-1">Name</span>
              <input
                type="text"
                className="input input-bordered w-full"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="New item name"
                disabled={isCreatingItem}
              />
            </label>
          </div>

          <label className="form-control w-full">
            <span className="label-text mb-1">Description</span>
            <textarea
              className="textarea textarea-bordered min-h-24 w-full"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Optional item description"
              disabled={isCreatingItem}
            />
          </label>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={isCreatingItem || !name.trim()}
          >
            {isCreatingItem ? 'Adding...' : 'Add Item'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default NewItem;
