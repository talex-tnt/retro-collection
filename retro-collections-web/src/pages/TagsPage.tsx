// Predefined color pairs for tag styles
const TAG_COLOR_PAIRS = [
  { name: 'Default', backgroundColor: null, foregroundColor: null },
  { name: 'Red', backgroundColor: '#f87171', foregroundColor: '#fff' },
  { name: 'Amber', backgroundColor: '#fbbf24', foregroundColor: '#222' },
  { name: 'Green', backgroundColor: '#34d399', foregroundColor: '#222' },
  { name: 'Blue', backgroundColor: '#60a5fa', foregroundColor: '#fff' },
  { name: 'Purple', backgroundColor: '#a78bfa', foregroundColor: '#fff' },
  { name: 'Pink', backgroundColor: '#f472b6', foregroundColor: '#222' },
  { name: 'Yellow', backgroundColor: '#facc15', foregroundColor: '#222' },
  { name: 'Gray', backgroundColor: '#d1d5db', foregroundColor: '#222' },
  { name: 'Black', backgroundColor: '#000000', foregroundColor: '#fff' },
  { name: 'White', backgroundColor: '#ffffff', foregroundColor: '#222' },
  { name: 'Dark Blue', backgroundColor: '#1e293b', foregroundColor: '#fff' },
];
import { useState } from 'react';
import { TagColorPicker } from '../components/TagColorPicker';
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

  // Find the index of a color pair matching bg/fg
  const findPairIndex = (bg: string, fg: string) => {
    return TAG_COLOR_PAIRS.findIndex(
      (pair) => pair.backgroundColor === bg && pair.foregroundColor === fg
    );
  };

  // Set style by color pair index
  const handleStylePairChange = (tagId: string, pairIndex: number) => {
    const pair = TAG_COLOR_PAIRS[pairIndex];
    const style = {
      backgroundColor: pair.backgroundColor,
      foregroundColor: pair.foregroundColor,
    };
    updateTagStyle({ userId, tag: tagId, style }).unwrap();
    // setStyleEdits((prev) => ({
    //   ...prev,
    //   [tagId]: {
    //     backgroundColor: pair.backgroundColor,
    //     foregroundColor: pair.foregroundColor,
    //   },
    // }));
  };

  // Invert bg/fg for the current edit
  // const handleInvertStyle = (tagId: string) => {
  //   setStyleEdits((prev) => {
  //     const current = prev[tagId] || {
  //       backgroundColor: '',
  //       foregroundColor: '',
  //     };
  //     return {
  //       ...prev,
  //       [tagId]: {
  //         backgroundColor: current.foregroundColor,
  //         foregroundColor: current.backgroundColor,
  //       },
  //     };
  //   });
  // };

  // const handleSaveStyle = async (tagId: string) => {
  //   const style = styleEdits[tagId];
  //   console.log('Saving style for', tagId, style);
  //   if (!style) return;
  //   try {
  //     await updateTagStyle({ userId, tag: tagId, style }).unwrap();
  //   } catch (err: any) {
  //     // Optionally show error
  //   }
  // };

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
                  {/* <span
                    className="font-mono text-base-content/80 px-2 py-1 rounded"
                    style={{
                      backgroundColor: style.backgroundColor || undefined,
                      color: style.foregroundColor || undefined,
                    }}
                  >
                    {tag.id}
                  </span> */}
                  <TagColorPicker
                    text={tag.id}
                    valueIndex={findPairIndex(
                      edit.backgroundColor,
                      edit.foregroundColor
                    )}
                    onChange={(idx) => handleStylePairChange(tag.id, idx)}
                    colorPairs={TAG_COLOR_PAIRS}
                  />
                  <button
                    className="btn btn-xs btn-error btn-outline"
                    onClick={() => handleDeleteTag(tag.id)}
                  >
                    Delete
                  </button>
                </div>
                <div className="flex flex-row gap-2 items-center relative">
                  {/* <label className="text-xs">Style</label> */}
                  {/* <button
                    className="btn btn-xs btn-outline ml-2"
                    type="button"
                    title="Invert colors"
                    onClick={() => handleInvertStyle(tag.id)}
                  >
                    Invert
                  </button> */}
                  {/* <button
                    className="btn btn-xs btn-primary ml-2"
                    onClick={() => handleSaveStyle(tag.id)}
                  >
                    Save Style
                  </button> */}
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
