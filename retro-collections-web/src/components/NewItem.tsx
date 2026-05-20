import { useRef, useState } from 'react';
import { useCreatePublicUserItemMutation } from '../api/firestore/firestoreApi';

interface NewItemProps {
  userId: string;
}

function NewItem({ userId }: NewItemProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const nameInputRef = useRef<HTMLInputElement | null>(null);

  const [createItem, { isLoading: isCreatingItem }] =
    useCreatePublicUserItemMutation();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!name.trim()) return;

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

      // ✅ restore focus AFTER submit
      requestAnimationFrame(() => {
        nameInputRef.current?.focus();
      });
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

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-3">
            <label className="form-control w-full">
              <span className="label-text mb-1">Name</span>
              <input
                ref={nameInputRef}
                type="text"
                className="input input-bordered w-full"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="New collectible name"
                disabled={isCreatingItem}
              />
            </label>

            <label className="form-control w-full">
              <span className="label-text mb-1">Description</span>
              <textarea
                className="textarea textarea-bordered min-h-24 w-full"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional collectible description"
                disabled={isCreatingItem}
              />
            </label>
          </div>

          <button
            type="submit"
            className="btn btn-primary mt-2"
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
