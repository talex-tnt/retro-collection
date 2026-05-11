import {
  useGetCollectionsQuery,
  useCreateCollectionMutation,
  useDeleteCollectionMutation,
} from '../api/firestore/firestoreApi';
import CollectionCounter from './CollectionCounter';

interface CollectionRecord {
  id: string;
  name: string;
  createdAt: string;
}

type SelectedCollection =
  | CollectionRecord
  | { id: 'orphaned'; name: 'Orphaned Items'; createdAt: '' };

interface CollectionsPanelProps {
  user: { uid: string } | null;
  selectedCollection: SelectedCollection | null;
  onSelectCollection: (collection: SelectedCollection) => void;
  collectionName: string;
  onCollectionNameChange: (name: string) => void;
  orphanedCount: number;
}

function CollectionsPanel({
  user,
  selectedCollection,
  onSelectCollection,
  collectionName,
  onCollectionNameChange,
  orphanedCount,
}: CollectionsPanelProps) {
  const { data: collections = [], isLoading: loadingCollections } =
    useGetCollectionsQuery(user?.uid || '', {
      skip: !user?.uid,
    });

  const [createCollection, { isLoading: isCreatingCollection }] =
    useCreateCollectionMutation();
  const [deleteCollection, { isLoading: isDeletingCollection }] =
    useDeleteCollectionMutation();

  const handleCreateCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !collectionName.trim()) return;

    try {
      await createCollection({
        name: collectionName.trim(),
        userId: user.uid,
      }).unwrap();
      onCollectionNameChange('');
    } catch (error) {
      console.error('Error creating collection:', error);
    }
  };

  const handleDeleteCollection = async (collectionId: string) => {
    if (
      !confirm(
        'Are you sure you want to delete this collection? This action cannot be undone.'
      )
    ) {
      return;
    }

    try {
      await deleteCollection(collectionId).unwrap();
    } catch (error) {
      console.error('Error deleting collection:', error);
    }
  };

  return (
    <div className="card bg-base-100 shadow-xl h-fit">
      <div className="card-body space-y-4 p-4">
        <h2 className="card-title text-lg">Collections</h2>

        {/* Create Collection */}
        <form onSubmit={handleCreateCollection} className="space-y-2">
          <input
            type="text"
            className="input input-bordered input-sm w-full"
            value={collectionName}
            onChange={(e) => onCollectionNameChange(e.target.value)}
            placeholder="Collection name"
            disabled={isCreatingCollection}
          />
          <button
            type="submit"
            className="btn btn-primary btn-sm w-full"
            disabled={isCreatingCollection || !collectionName.trim()}
          >
            {isCreatingCollection ? 'Creating...' : 'New Collection'}
          </button>
        </form>

        <div className="divider my-2"></div>

        {/* Collections List */}
        <div className="space-y-2 max-h-[calc(100vh-400px)] overflow-y-auto">
          {loadingCollections ? (
            <p className="text-sm text-base-content/70">Loading...</p>
          ) : collections.length === 0 ? (
            <p className="text-sm text-base-content/70">No collections yet</p>
          ) : (
            collections.map((collectionItem) => (
              <div
                key={collectionItem.id}
                className={`p-2 rounded cursor-pointer transition-colors flex items-center justify-between gap-2 ${
                  selectedCollection?.id === collectionItem.id
                    ? 'bg-primary text-primary-content'
                    : 'bg-base-200 hover:bg-base-300'
                }`}
              >
                <button
                  className="flex-1 text-left text-sm font-medium truncate"
                  onClick={() => onSelectCollection(collectionItem)}
                >
                  {collectionItem.name}
                </button>
                {user && (
                  <CollectionCounter
                    collectionId={collectionItem.id}
                    userId={user.uid}
                  />
                )}
                <button
                  className="btn btn-ghost btn-xs text-error hover:text-error-content"
                  onClick={() => handleDeleteCollection(collectionItem.id)}
                  disabled={isDeletingCollection}
                  title="Delete collection"
                >
                  ✕
                </button>
              </div>
            ))
          )}
          {orphanedCount > 0 && (
            <div
              className={`p-2 rounded cursor-pointer transition-colors flex items-center justify-between gap-2 ${
                selectedCollection?.id === 'orphaned'
                  ? 'bg-warning text-warning-content'
                  : 'bg-base-200 hover:bg-base-300'
              }`}
            >
              <button
                className="flex-1 text-left text-sm font-medium truncate"
                onClick={() =>
                  onSelectCollection({
                    id: 'orphaned',
                    name: 'Orphaned Items',
                    createdAt: '',
                  })
                }
              >
                Orphaned Items
              </button>
              <span className="text-xs badge badge-warning badge-sm">
                {orphanedCount}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default CollectionsPanel;
