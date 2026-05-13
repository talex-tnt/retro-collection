import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  useGetPublicCollectionsByUserIdQuery,
  useGetPublicItemsByCollectionIdQuery,
  useGetUserByIdQuery,
} from '../api/firestore/firestoreApi';

interface CollectionRecord {
  id: string;
  name: string;
  createdAt: string;
  visibility?: {
    public: boolean;
  };
}

interface ItemRecord {
  id: string;
  name: string;
  collectionId?: string;
  createdAt: string;
  description?: string;
  visibility?: {
    public: boolean;
  };
}

function CollectorPage() {
  const navigate = useNavigate();
  const { userId, collectionId } = useParams();

  const { data: user } = useGetUserByIdQuery(userId || '', {
    skip: !userId,
  });

  const { data: collections = [], isLoading: loadingCollections } =
    useGetPublicCollectionsByUserIdQuery(userId || '', {
      skip: !userId,
    });

  const selectedCollection = useMemo(() => {
    if (!collectionId) {
      return null;
    }

    return (
      collections.find((collection) => collection.id === collectionId) ?? null
    );
  }, [collectionId, collections]);

  const { data: items = [], isLoading: loadingItems } =
    useGetPublicItemsByCollectionIdQuery(selectedCollection?.id || '', {
      skip: !selectedCollection?.id,
    });

  const handleSelectCollection = (collection: CollectionRecord) => {
    navigate(`/collectors/${userId}/collections/${collection.id}`);
  };

  if (!userId) {
    return (
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">Collector</h2>
          <p>Missing user id.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(280px,340px)_1fr]">
      <div className="card bg-base-100 shadow-xl h-fit">
        <div className="card-body space-y-4 p-4">
          <div>
            <h2 className="card-title text-lg">Collector</h2>
            <p className="text-sm text-base-content/70">
              {user?.name || user?.email || userId}
            </p>
          </div>

          <div className="space-y-2">
            {loadingCollections ? (
              <div className="alert alert-info">Loading collections...</div>
            ) : collections.length === 0 ? (
              <div className="alert alert-info">No public collections.</div>
            ) : (
              collections.map((collection) => (
                <button
                  key={collection.id}
                  type="button"
                  className={`w-full rounded-lg border border-base-300 px-3 py-2 text-left transition-colors ${
                    selectedCollection?.id === collection.id
                      ? 'bg-primary text-primary-content'
                      : 'bg-base-200 hover:bg-base-300'
                  }`}
                  onClick={() => handleSelectCollection(collection)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium truncate">
                      {collection.name}
                    </span>
                    <span className="badge badge-sm badge-outline">Public</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="card bg-base-100 shadow-xl">
        <div className="card-body space-y-4">
          {selectedCollection ? (
            <>
              <div>
                <h2 className="card-title">{selectedCollection.name}</h2>
                <p className="text-sm text-base-content/70">
                  Public items only
                </p>
              </div>

              {loadingItems ? (
                <div className="alert alert-info">Loading items...</div>
              ) : items.length === 0 ? (
                <div className="alert alert-info">
                  No public items in this collection.
                </div>
              ) : (
                <div className="space-y-3">
                  {items.map((item: ItemRecord) => (
                    <div
                      key={item.id}
                      className="rounded-lg border border-base-300 bg-base-200 p-4"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-2">
                          <p className="font-medium">{item.name}</p>
                          {item.description && (
                            <p className="text-sm text-base-content/80 whitespace-pre-wrap">
                              {item.description}
                            </p>
                          )}
                        </div>
                        <span className="badge badge-sm badge-success">
                          Public
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-base-content/70">
                        Added{' '}
                        {item.createdAt
                          ? new Date(item.createdAt).toLocaleString()
                          : 'No timestamp'}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="alert alert-info">
              Select a public collection to view its public items.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default CollectorPage;
