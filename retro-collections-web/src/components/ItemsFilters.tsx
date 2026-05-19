import { useState } from 'react';
import { useGetPublicUserTagsQuery } from '../api/firestore/firestoreApi';

interface ItemsFiltersProps {
  userId: string;
  itemFilter: string;
  onItemFilterChange: (filter: string) => void;
  selectedTags: string[];
  setSelectedTags: (tags: string[]) => void;
}

export default function ItemsFilters({
  userId,
  itemFilter,
  onItemFilterChange,
  selectedTags,
  setSelectedTags,
}: ItemsFiltersProps) {
  // Fetch all tags for the user
  const { data: allTags = [] } = useGetPublicUserTagsQuery(
    { userId },
    { skip: !userId }
  );

  return (
    <div className="card bg-base-100 shadow-md">
      <div className="card-body space-y-4">
        <h2 className="card-title mb-2">Filter Collectibles</h2>
        {/* Tag Filter UI */}
        <div className="flex flex-wrap gap-2 mb-2">
          {allTags.map((tag) => (
            <button
              key={tag.id}
              className={`badge badge-lg cursor-pointer select-none ${selectedTags.includes(tag.id) ? 'badge-primary' : 'badge-outline'}`}
              onClick={() => {
                setSelectedTags(
                  selectedTags.includes(tag.id)
                    ? selectedTags.filter((t) => t !== tag.id)
                    : [...selectedTags, tag.id]
                );
              }}
            >
              {tag.id}
            </button>
          ))}
          {allTags.length > 0 && (
            <button
              className="btn btn-xs ml-2"
              onClick={() => setSelectedTags([])}
              disabled={selectedTags.length === 0}
            >
              Clear
            </button>
          )}
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
      </div>
    </div>
  );
}
