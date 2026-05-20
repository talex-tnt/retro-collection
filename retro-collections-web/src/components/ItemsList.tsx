import { useState } from 'react';
import {
  useGetPublicUserItemsQuery,
  useGetPublicUserItemsCountQuery,
} from '../api/firestore/firestoreApi';

import ListItem from './ListItem';

interface ItemsListProps {
  user: { uid: string } | null;
  itemFilter: string;
  onItemFilterChange: (filter: string) => void;
  selectedTags: string[];
  isPublic?: boolean;
}

function ItemsList({
  user,
  itemFilter,
  onItemFilterChange,
  selectedTags,
  isPublic,
}: ItemsListProps) {
  const [showTags, setShowTags] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const pageSizeOptions = [1, 2, 3, 4, 5, 10, 25, 50, 100, 'all'] as const;

  // Fetch total count for pagination
  const { data: totalCount = 0 } = useGetPublicUserItemsCountQuery(
    user?.uid || '',
    {
      skip: !user?.uid,
    }
  );

  // Pagination logic
  const skip = pageSize === 'all' ? 0 : (page - 1) * pageSize;
  const limit = pageSize === 'all' ? undefined : pageSize;

  // NOTE: The backend currently does not support skip/limit, so this is a UI placeholder.
  // You must update the backend to support skip/limit for true server-side pagination.

  const {
    data: itemsData,
    isLoading: loadingItems,
    error: itemsError,
  } = useGetPublicUserItemsQuery(
    {
      userId: user?.uid || '',
      tags: selectedTags.length > 0 ? selectedTags : undefined,
      name: itemFilter.trim() ? itemFilter : undefined,
      isPublic,
      limit: pageSize === 'all' ? 1000 : pageSize, // Arbitrary high limit for 'all'
      // TODO: Add startAfter for real pagination
    },
    { skip: !user?.uid }
  );

  const items = itemsData?.items || [];
  const pageInfo = itemsData?.pageInfo;
  const totalPages =
    pageSize === 'all' ? 1 : Math.ceil(totalCount / (pageSize as number));

  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body space-y-4">
        {/* Items Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <div className="flex items-center gap-2">
            <h2 className="card-title">My Collectibles</h2>
            <button
              className="btn btn-sm btn-outline"
              onClick={() => setShowTags((v) => !v)}
            >
              {showTags ? 'Hide Tags' : 'Show Tags'}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <label className="label text-xs">Rows per page:</label>
            <select
              className="select select-bordered select-xs"
              value={pageSize}
              onChange={(e) => {
                const val =
                  e.target.value === 'all' ? 'all' : Number(e.target.value);
                setPageSize(val as typeof pageSize);
                setPage(1);
              }}
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt === 'all' ? 'All' : opt}
                </option>
              ))}
            </select>
          </div>
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
          ) : items.length === 0 ? (
            <div className="alert alert-info">
              {itemFilter
                ? 'No collectibles match your filter.'
                : 'No collectibles yet.'}
            </div>
          ) : (
            items.map((item) => (
              <ListItem
                key={item.id}
                item={item}
                showTags={showTags}
                userId={user?.uid || ''}
                // Handlers are required by ListItem but not used here
                handleToggleItemVisibility={() => {}}
                handleDeleteItem={() => {}}
              />
            ))
          )}
        </div>

        {/* Pagination Controls */}
        {pageSize !== 'all' && totalPages > 1 && (
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              className="btn btn-xs"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Prev
            </button>
            <span className="text-xs">
              Page {page} of {totalPages}
            </span>
            <button
              className="btn btn-xs"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default ItemsList;
