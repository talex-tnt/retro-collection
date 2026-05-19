import { useGetPublicUserTagsQuery } from '../api/firestore/firestoreApi';

interface ItemsFiltersProps {
  userId: string;
  itemFilter: string;
  onItemFilterChange: (filter: string) => void;
  selectedTags: string[];
  setSelectedTags: (tags: string[]) => void;
  visibilityFilter?: 'public' | 'private' | '';
  onVisibilityFilterChange?: (v: 'public' | 'private' | '') => void;
}

export default function ItemsFilters({
  userId,
  itemFilter,
  onItemFilterChange,
  selectedTags,
  setSelectedTags,
  visibilityFilter = '',
  onVisibilityFilterChange,
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
        {/* Tag & Visibility Filter UI */}
        <div className="flex flex-wrap gap-2 mb-2 items-center">
          {allTags.map((tag) => {
            const isSelected = selectedTags.includes(tag.id);
            const style =
              isSelected && tag.style
                ? {
                    backgroundColor: tag.style.backgroundColor || undefined,
                    color: tag.style.foregroundColor || undefined,
                    borderColor: tag.style.foregroundColor || undefined,
                  }
                : undefined;
            return (
              <button
                key={tag.id}
                className={`badge badge-lg cursor-pointer select-none transition-opacity ${isSelected ? 'opacity-100' : 'badge-outline opacity-50 hover:opacity-80'}`}
                style={isSelected && style ? style : undefined}
                onClick={() => {
                  setSelectedTags(
                    isSelected
                      ? selectedTags.filter((t) => t !== tag.id)
                      : [...selectedTags, tag.id]
                  );
                }}
              >
                {tag.id}
              </button>
            );
          })}
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
            placeholder="Filter collectibles by name..."
          />
        </div>
        {/* Visibility Filter */}
        <select
          className="select select-xs min-w-[100px]"
          value={visibilityFilter}
          onChange={(e) =>
            onVisibilityFilterChange?.(
              e.target.value as 'public' | 'private' | ''
            )
          }
        >
          <option value="">All</option>
          <option value="public">Public</option>
          <option value="private">Private</option>
        </select>
      </div>
    </div>
  );
}
