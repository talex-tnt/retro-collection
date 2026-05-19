import { useParams } from 'react-router-dom';
import {
  useGetPublicUserItemsQuery,
  useGetUserByIdQuery,
} from '../api/firestore/firestoreApi';
import Tags from '../components/Tags';

interface ItemRecord {
  id: string;
  name: string;
  createdAt: string;
  description?: string;
  visibility?: {
    public: boolean;
  };
}

function CollectorPage() {
  const { userId } = useParams();

  const { data: user } = useGetUserByIdQuery(userId || '', {
    skip: !userId,
  });

  const { data: items = [], isLoading: loadingItems } =
    useGetPublicUserItemsQuery({ userId: userId || '' }, { skip: !userId });

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
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body space-y-4">
        <div>
          <h2 className="card-title text-lg">Collector</h2>
          <p className="text-sm text-base-content/70">
            {user?.nickname ? `@${user.nickname}` : user?.name || userId}
          </p>
          {user?.name && user?.nickname && (
            <p className="text-xs text-base-content/50 mt-1">{user.name}</p>
          )}
        </div>

        <div>
          <h3 className="text-md font-semibold mb-2">Public Collectibles</h3>
          {loadingItems ? (
            <div className="alert alert-info">Loading collectibles...</div>
          ) : items.length === 0 ? (
            <div className="alert alert-info">No public collectibles.</div>
          ) : (
            <div className="space-y-3">
              {items
                .filter((item: ItemRecord) => item.visibility?.public)
                .map((item: ItemRecord) => (
                  <div
                    key={item.id}
                    className="rounded-lg border border-base-300 bg-base-200 p-4"
                  >
                    {/* Render tags in read-only mode */}
                        <div className="mt-2 mb-2">
                      <Tags
                        userId={userId}
                        itemId={item.id}
                        tags={item.tags || []}
                        readOnly={true}
                      />
                    </div>
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
        </div>
      </div>
    </div>
  );
}

export default CollectorPage;
