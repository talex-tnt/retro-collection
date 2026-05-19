import { useState } from 'react';
import { useCreatePublicUserItemMutation } from '../api/firestore/firestoreApi';

interface NewItemProps {
  userId: string;
}

function NewItem({ userId }: NewItemProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const [createItem, { isLoading: isCreatingItem }] =
    useCreatePublicUserItemMutation();

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
          <h2 className="card-title text-lg">New Collectible</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-1">
            <label className="form-control w-full">
              <span className="label-text mb-1">Name</span>
              <input
                type="text"
                className="input input-bordered w-full"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="New collectible name"
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
              placeholder="Optional collectible description"
              disabled={isCreatingItem}
            />
          </label>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={isCreatingItem || !name.trim()}
          >
            {isCreatingItem ? 'Adding...' : 'Add Collectible'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default NewItem;
