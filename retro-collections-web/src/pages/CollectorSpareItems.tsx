import { useEffect, useState } from 'react';
import { useGetPublicUserItemsQuery } from '../api/firestore/firestoreApi';
import Tags from '../components/Tags';

interface ItemRecord {
  id: string;
  name: string;
  createdAt: string;
  description?: string;
  visibility?: {
    public: boolean;
  };
  tags?: string[];
}

interface Cursor {
  createdAt: string;
  id: string;
}

function CollectorSpareItems({ userId }: { userId: string }) {
  // 🔥 pagination state
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState<number | 'all'>(5);
  const [cursors, setCursors] = useState<(Cursor | null)[]>([null]);

  const isAll = pageSize === 'all';
  const currentCursor = cursors[pageIndex];

  const { data: itemsData, isLoading: loadingItems } =
    useGetPublicUserItemsQuery(
      {
        userId: userId || '',
        isPublic: true,
        limit: isAll ? undefined : pageSize,
        startAfter: currentCursor,
      },
      { skip: !userId }
    );

  const items = itemsData?.items || [];
  const pageInfo = itemsData?.pageInfo;

  // 🔥 store next page cursor
  useEffect(() => {
    if (!pageInfo?.endCursor) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCursors((prev) => {
      const next = [...prev];
      next[pageIndex + 1] = pageInfo.endCursor;
      return next;
    });
  }, [pageInfo?.endCursor, pageIndex]);

  return (
    <>
      {/* ITEMS */}
      <div>
        <h3 className="text-md font-semibold mb-2">Public Collectibles</h3>

        {loadingItems ? (
          <div className="alert alert-info">Loading collectibles...</div>
        ) : items.length === 0 ? (
          <div className="alert alert-info">No public collectibles.</div>
        ) : (
          <div className="space-y-3">
            {items.map((item: ItemRecord) => (
              <div
                key={item.id}
                className="rounded-lg border border-base-300 bg-base-200 p-4"
              >
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

                  <span className="badge badge-sm badge-success">Public</span>
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
      {/* PAGINATION */}
      <div className="flex flex-col gap-3 pt-4">
        {/* NAV */}
        <div className="flex justify-end gap-2 items-center">
          {/* PAGE SIZE */}
          <label className="text-xs opacity-70">Items per page:</label>

          <select
            className="select select-xs select-bordered w-20"
            value={pageSize}
            onChange={(e) => {
              const val =
                e.target.value === 'all' ? 'all' : Number(e.target.value);

              setPageSize(val as number | 'all');
              setPageIndex(0);
              setCursors([null]);
            }}
          >
            {[1, 2, 3, 5, 10, 25].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
            <option value="all">All</option>
          </select>
          <button
            className="btn btn-xs"
            onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
            disabled={pageIndex === 0 || isAll}
          >
            Prev
          </button>

          <span className="text-xs">Page {pageIndex + 1}</span>

          <button
            className="btn btn-xs"
            onClick={() => {
              if (isAll) return;
              if (!pageInfo?.hasNextPage) return;
              setPageIndex((p) => p + 1);
            }}
            disabled={isAll || !pageInfo?.hasNextPage}
          >
            Next
          </button>
        </div>
      </div>
      =
    </>
  );
}

export default CollectorSpareItems;
