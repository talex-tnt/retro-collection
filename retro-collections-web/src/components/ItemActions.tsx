import { FiEdit2, FiEye, FiEyeOff, FiTrash2 } from 'react-icons/fi';

interface ItemActionsProps {
  itemId: string;
  isPublic: boolean;
  onEdit: () => void;
  onToggleVisibility: (itemId: string, currentVisibility: boolean) => void;
  onDelete: (itemId: string) => void;
}

function ItemActions({
  itemId,
  isPublic,
  onEdit,
  onToggleVisibility,
  onDelete,
}: ItemActionsProps) {
  return (
    <div className="flex gap-2">
      <button
        className="btn btn-sm btn-ghost tooltip"
        data-tip="Edit collectible"
        onClick={onEdit}
        title="Edit collectible"
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
        data-tip="Delete collectible"
        onClick={() => onDelete(itemId)}
        title="Delete collectible"
      >
        <FiTrash2 size={18} />
      </button>
    </div>
  );
}

export default ItemActions;
