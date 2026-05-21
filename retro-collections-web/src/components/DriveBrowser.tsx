import { useEffect, useState } from 'react';
import { useListFilesQuery } from '../api/google-drive/googleDriveApi';
import DriveImage from './DriveImage';

type DriveBrowserProps = {
  onSelectFolder: (data: {
    folder: { id: string; name: string };
    files: { id: string; name: string; mimeType?: string }[];
  }) => void;
  selectedFolder?: { id: string; name: string };
};

const DriveBrowser = ({
  onSelectFolder,
  selectedFolder,
}: DriveBrowserProps) => {
  const [currentFolder, setCurrentFolder] = useState(
    selectedFolder || {
      id: 'root',
      name: 'Root',
    }
  );
  console.log('currentFolder state:', currentFolder); // Debug log for current folder state
  useEffect(() => {
    if (selectedFolder) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCurrentFolder(selectedFolder);
    }
  }, [selectedFolder]);

  const { data, isLoading } = useListFilesQuery({
    folderId: currentFolder.id,
  });

  const files = data?.files || [];
  console.log('Google Drive files in current folder:', {
    currentFolder,
    files,
  }); // Debug log for Google Drive files
  const folders = files.filter(
    (f: { mimeType: string }) =>
      f.mimeType === 'application/vnd.google-apps.folder'
  );

  const images = files.filter((f: { mimeType: string }) =>
    f.mimeType.startsWith('image/')
  );

  return (
    <div className="card bg-transparent w-full max-w-md mx-auto">
      <div className="card-body p-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="card-title text-base-content text-lg font-semibold">
            Google Drive Folder Browser
          </h3>
          {currentFolder.id !== 'root' && (
            <button
              className="btn btn-xs btn-outline ml-4"
              onClick={() => setCurrentFolder({ id: 'root', name: 'Root' })}
            >
              ⬅ Root
            </button>
          )}
        </div>
        <div className="mb-2">
          <span className="text-xs opacity-70">Current folder:</span>
          <span className="ml-2 font-mono text-sm">{currentFolder.name}</span>
        </div>

        {isLoading && (
          <div className="flex items-center gap-2 my-4">
            <span className="loading loading-spinner loading-xs" />
            <span className="text-xs opacity-70">Loading folders...</span>
          </div>
        )}

        <ul className="space-y-2 mb-4">
          {folders.map((folder: { id: string; name: string }) => (
            <li key={folder.id} className="flex items-center gap-2">
              <button
                className="btn btn-ghost btn-sm flex items-center gap-1"
                onClick={() => setCurrentFolder(folder)}
                title={`Open ${folder.name}`}
              >
                <span className="text-xl">📁</span>
                <span className="truncate max-w-[120px] text-left">
                  {folder.name}
                </span>
              </button>
              {/* <button
                className="btn btn-outline btn-xs"
                onClick={() =>
                  onSelectFolder({
                    id: folder.id,
                    name: folder.name,
                  })
                }
              >
                Select
              </button> */}
            </li>
          ))}
        </ul>

        {folders.length === 0 && !isLoading && (
          <div className="text-xs opacity-60 mt-4">
            No folders found in this directory.
          </div>
        )}

        {/* Images grid */}
        <div className="mt-2">
          <h4 className="font-semibold text-sm mb-2">Images</h4>
          {images.length === 0 && !isLoading && (
            <div className="text-xs opacity-60">No images in this folder.</div>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {images.map((img: { id: string; name: string }) => (
              <div key={img.id} className="flex flex-col items-center">
                <div className="w-full h-[100px] bg-base-200 rounded overflow-hidden flex items-center justify-center">
                  <DriveImage fileId={img.id} name={img.name} />
                </div>
                <span
                  className="text-xs mt-1 truncate max-w-[100px]"
                  title={img.name}
                >
                  {img.name}
                </span>
              </div>
            ))}
          </div>
        </div>

        <button
          className="btn btn-outline btn-xs"
          onClick={() =>
            onSelectFolder({
              folder: {
                id: currentFolder.id,
                name: currentFolder.name,
              },
              files,
            })
          }
        >
          Select {currentFolder.name}
        </button>
        <button
          className="btn btn-xs btn-outline"
          onClick={() =>
            onSelectFolder({ folder: { id: '', name: '' }, files: [] })
          }
        >
          Unset
        </button>
      </div>
    </div>
  );
};

export default DriveBrowser;
