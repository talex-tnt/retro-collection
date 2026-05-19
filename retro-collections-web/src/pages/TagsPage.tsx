import { useState } from 'react';
import {
  useGetPublicUserTagsQuery,
  useCreatePublicUserTagMutation,
  useDeletePublicUserTagMutation,
  useUpdatePublicUserTagMutation,
} from '../api/firestore/firestoreApi';

interface TagsPageProps {
  user: { uid: string };
}

export default function TagsPage({ user }: TagsPageProps) {
  const userId = user.uid;
  const {
    data: tags = [],
    isLoading,
    error,
  } = useGetPublicUserTagsQuery({ userId }, { skip: !userId });
  const [createTag] = useCreatePublicUserTagMutation();
  const [deleteTag] = useDeletePublicUserTagMutation();
  const [newTag, setNewTag] = useState('');
  const [addError, setAddError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [updateTagStyle] = useUpdatePublicUserTagMutation();
  const [styleEdits, setStyleEdits] = useState<
    Record<string, { backgroundColor: string; foregroundColor: string }>
  >({});
  const handleStyleChange = (
    tagId: string,
    field: 'backgroundColor' | 'foregroundColor',
    value: string
  ) => {
    setStyleEdits((prev) => ({
      ...prev,
      [tagId]: {
        ...prev[tagId],
        [field]: value,
      },
    }));
  };

  const handleSaveStyle = async (tagId: string) => {
    const style = styleEdits[tagId];
    if (!style) return;
    try {
      await updateTagStyle({ userId, tag: tagId, style }).unwrap();
    } catch (err: any) {
      // Optionally show error
    }
  };

  const handleAddTag = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);
    const tag = newTag.trim();
    if (!tag) return;
    if (tags.some((t) => t.id.toLowerCase() === tag.toLowerCase())) {
      setAddError('Tag already exists');
      return;
    }
    try {
      await createTag({ userId, tag }).unwrap();
      setNewTag('');
    } catch (err: any) {
      setAddError(err?.message || 'Failed to add tag');
    }
  };

  const handleDeleteTag = async (tagId: string) => {
    setDeleteError(null);
    try {
      await deleteTag({ userId, tag: tagId }).unwrap();
    } catch (err: any) {
      setDeleteError(err?.message || 'Failed to delete tag');
    }
  };

  return (
    <div className="max-w-xl mx-auto mt-8 p-6 bg-base-200 rounded-lg shadow">
      <h1 className="text-2xl font-bold mb-4">Manage Tags</h1>
      <form className="flex gap-2 mb-6" onSubmit={handleAddTag}>
        <input
          type="text"
          className="input input-bordered input-sm flex-1"
          placeholder="New tag name"
          value={newTag}
          onChange={(e) => setNewTag(e.target.value)}
        />
        <button type="submit" className="btn btn-sm btn-primary">
          Add Tag
        </button>
      </form>
      {addError && <div className="text-error text-xs mb-2">{addError}</div>}
      {isLoading ? (
        <div className="text-base-content/60">Loading tags...</div>
      ) : error ? (
        <div className="text-error">Failed to load tags</div>
      ) : tags.length === 0 ? (
        <div className="text-base-content/60 italic">No tags found.</div>
      ) : (
        <ul className="space-y-2">
          {tags.map((tag) => {
            const style = tag.style || {};
            console.log('style for tag', tag.id, style);
            const edit = styleEdits[tag.id] || {
              backgroundColor: style.backgroundColor || '',
              foregroundColor: style.foregroundColor || '',
            };
            return (
              <li
                key={tag.id}
                className="flex flex-col gap-2 bg-base-100 rounded px-3 py-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className="font-mono text-base-content/80 px-2 py-1 rounded"
                    style={{
                      backgroundColor: style.backgroundColor || undefined,
                      color: style.foregroundColor || undefined,
                    }}
                  >
                    {tag.id}
                  </span>
                  <button
                    className="btn btn-xs btn-error btn-outline"
                    onClick={() => handleDeleteTag(tag.id)}
                  >
                    Delete
                  </button>
                </div>
                <div className="flex flex-row gap-2 items-center">
                  <label className="text-xs">BG</label>
                  <input
                    type="color"
                    value={edit.backgroundColor || '#ffffff'}
                    onChange={(e) =>
                      handleStyleChange(
                        tag.id,
                        'backgroundColor',
                        e.target.value
                      )
                    }
                  />
                  <label className="text-xs">FG</label>
                  <input
                    type="color"
                    value={edit.foregroundColor || '#000000'}
                    onChange={(e) =>
                      handleStyleChange(
                        tag.id,
                        'foregroundColor',
                        e.target.value
                      )
                    }
                  />
                  <button
                    className="btn btn-xs btn-primary"
                    onClick={() => handleSaveStyle(tag.id)}
                  >
                    Save Style
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {deleteError && (
        <div className="text-error text-xs mt-2">{deleteError}</div>
      )}
    </div>
  );
}
