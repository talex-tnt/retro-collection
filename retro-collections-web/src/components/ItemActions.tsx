import { FiEdit2, FiEye, FiEyeOff, FiTrash2 } from 'react-icons/fi';

interface ItemActionsProps {
  itemId: string;
  itemName: string;
  isPublic: boolean;
  onEdit: (itemId: string, newName: string) => void;
  onToggleVisibility: (itemId: string, currentVisibility: boolean) => void;
  onDelete: (itemId: string) => void;
}

function ItemActions({
  itemId,
  itemName,
  isPublic,
  onEdit,
  onToggleVisibility,
  onDelete,
}: ItemActionsProps) {
  const handleEdit = () => {
    const newName = prompt('New item name:', itemName);
    if (newName) {
      onEdit(itemId, newName);
    }
  };

  return (
    <div className="flex gap-2">
      <button
        className="btn btn-sm btn-ghost tooltip"
        data-tip="Edit item"
        onClick={handleEdit}
        title="Edit item"
      >
        <FiEdit2 size={18} />
      </button>
      <button
        className="btn btn-sm btn-ghost tooltip"
        data-tip={isPublic ? 'Make Private' : 'Make Public'}
        onClick={() => onToggleVisibility(itemId, isPublic)}
        title={isPublic ? 'Make Private' : 'Make Public'}
      >
        {isPublic ? <FiEyeOff size={18} /> : <FiEye size={18} />}
      </button>
      <button
        className="btn btn-sm btn-ghost text-error hover:text-error tooltip"
        data-tip="Delete item"
        onClick={() => onDelete(itemId)}
        title="Delete item"
      >
        <FiTrash2 size={18} />
      </button>
    </div>
  );
}

export default ItemActions;
