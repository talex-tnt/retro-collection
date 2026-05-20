import { useState, useMemo } from 'react';
import {
  useListFilesQuery,
  useGetFileDownloadQuery,
} from '../api/google-drive/googleDriveApi';

type DriveBrowserProps = {
  onSelectFolder: (folder: { id: string; name: string }) => void;
};

// 🖼️ helper component for full image loading (Drive API)
const DriveImage = ({ fileId, name }: { fileId: string; name: string }) => {
  const { data: blob } = useGetFileDownloadQuery(fileId);

  const url = useMemo(() => {
    if (!blob) return null;
    return URL.createObjectURL(blob);
  }, [blob]);

  if (!url) return null;

  return (
    <img
      src={url}
      alt={name}
      style={{
        width: '100%',
        height: 120,
        objectFit: 'cover',
        borderRadius: 8,
      }}
    />
  );
};

const DriveBrowser = ({ onSelectFolder }: DriveBrowserProps) => {
  const [currentFolder, setCurrentFolder] = useState('root');

  const { data, isLoading } = useListFilesQuery({
    folderId: currentFolder,
  });

  const files = data?.files || [];

  const folders = files.filter(
    (f: { mimeType: string }) =>
      f.mimeType === 'application/vnd.google-apps.folder'
  );

  const images = files.filter((f: { mimeType: string }) =>
    f.mimeType.startsWith('image/')
  );

  return (
    <div className="card bg-base-100 w-full max-w-md mx-auto">
      <div className="card-body p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="card-title text-base-content text-lg font-semibold">
            Google Drive Folder Browser
          </h3>
          {currentFolder !== 'root' && (
            <button
              className="btn btn-xs btn-outline"
              onClick={() => setCurrentFolder('root')}
            >
              ⬅ Root
            </button>
          )}
        </div>
        <div className="mb-2">
          <span className="text-xs opacity-70">Current folder:</span>
          <span className="ml-2 font-mono text-sm">{currentFolder}</span>
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
                onClick={() => setCurrentFolder(folder.id)}
                title={`Open ${folder.name}`}
              >
                <span className="text-xl">📁</span>
                <span className="truncate max-w-[120px] text-left">
                  {folder.name}
                </span>
              </button>
              <button
                className="btn btn-outline btn-xs"
                onClick={() =>
                  onSelectFolder({
                    id: folder.id,
                    name: folder.name,
                  })
                }
              >
                Select
              </button>
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
      </div>
    </div>
  );
};

export default DriveBrowser;
