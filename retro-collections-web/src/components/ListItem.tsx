import ItemActions from './ItemActions';

interface ListItemProps {
  item: any;
  editingItemId: string | null;
  editingField: 'name' | 'description' | null;
  editValue: string;
  startEditing: (
    itemId: string,
    field: 'name' | 'description',
    currentValue: string
  ) => void;
  saveEdit: (itemId: string) => void;
  cancelEdit: () => void;
  setEditValue: (value: string) => void;
  handleEditItem: (itemId: string, newName: string) => void;
  handleToggleItemVisibility: (
    itemId: string,
    currentVisibility: boolean
  ) => void;
  handleDeleteItem: (itemId: string) => void;
}

function ListItem({
  item,
  editingItemId,
  editingField,
  editValue,
  startEditing,
  saveEdit,
  cancelEdit,
  setEditValue,
  handleEditItem,
  handleToggleItemVisibility,
  handleDeleteItem,
}: ListItemProps) {
  return (
    <div
      key={item.id}
      className="flex flex-col gap-2 rounded-lg border border-base-300 bg-base-200 p-4"
    >
      <div className="flex items-center justify-between gap-2">
        {editingItemId === item.id && editingField === 'name' ? (
          <input
            className="input input-sm input-bordered font-medium w-full max-w-xs"
            value={editValue}
            autoFocus
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={() => saveEdit(item.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveEdit(item.id);
              if (e.key === 'Escape') cancelEdit();
            }}
          />
        ) : (
          <p
            className="font-medium cursor-pointer hover:underline"
            onDoubleClick={() => startEditing(item.id, 'name', item.name)}
            title="Double-click to edit name"
          >
            {item.name}
          </p>
        )}
        <ItemActions
          itemId={item.id}
          itemName={item.name}
          isPublic={!!item.visibility?.public}
          onEdit={handleEditItem}
          onToggleVisibility={handleToggleItemVisibility}
          onDelete={handleDeleteItem}
        />
      </div>
      <div className="flex flex-row gap-4 justify-between items-start w-full">
        {/* Description (left) */}
        <div className="flex-1 min-w-0">
          {editingItemId === item.id && editingField === 'description' ? (
            <textarea
              className="textarea textarea-bordered textarea-sm w-full"
              value={editValue}
              autoFocus
              rows={2}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={() => saveEdit(item.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  saveEdit(item.id);
                }
                if (e.key === 'Escape') cancelEdit();
              }}
            />
          ) : item.description ? (
            <p
              className="text-sm text-base-content/80 whitespace-pre-wrap cursor-pointer hover:underline"
              onDoubleClick={() =>
                startEditing(item.id, 'description', item.description)
              }
              title="Double-click to edit description"
            >
              {item.description}
            </p>
          ) : (
            <p
              className="text-sm text-base-content/80 italic cursor-pointer hover:underline"
              onDoubleClick={() => startEditing(item.id, 'description', '')}
              title="Double-click to add description"
            >
              Add description...
            </p>
          )}
        </div>
        {/* Meta info (right, below actions) */}
        <div className="flex flex-col items-end flex-shrink-0 text-right gap-1 min-w-[140px] ml-2">
          <p className="text-xs text-base-content/70">
            {item.createdAt
              ? `Added ${new Date(item.createdAt).toLocaleString()}`
              : 'No timestamp'}
          </p>
          <p
            className="text-xs text-base-content/70 cursor-pointer hover:underline"
            title="Double-click to toggle visibility"
            onDoubleClick={() =>
              handleToggleItemVisibility(item.id, !!item.visibility?.public)
            }
          >
            Visibility: {item.visibility?.public ? 'Public' : 'Private'}
          </p>
        </div>
      </div>
    </div>
  );
}

export default ListItem;
