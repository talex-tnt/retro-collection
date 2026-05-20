import { useState, useEffect, useMemo } from 'react';
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
    <div>
      <h3>Current folder: {currentFolder}</h3>

      {isLoading && <p>Loading...</p>}

      {/* 📁 FOLDERS */}
      <div>
        <h4>Folders</h4>

        <ul>
          {folders.map((folder: { id: string; name: string }) => (
            <li key={folder.id}>
              <button onClick={() => setCurrentFolder(folder.id)}>
                📁 {folder.name}
              </button>

              <button
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
      </div>

      {/* 🖼️ IMAGES */}
      <div style={{ marginTop: 20 }}>
        <h4>Images</h4>

        {images.length === 0 && <p>No images in this folder</p>}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
            gap: 10,
          }}
        >
          {images.map((img: { id: string; name: string }) => (
            <div key={img.id}>
              <DriveImage fileId={img.id} name={img.name} />

              <p style={{ fontSize: 12 }}>{img.name}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ⬅ BACK */}
      {currentFolder !== 'root' && (
        <button onClick={() => setCurrentFolder('root')}>⬅ Back</button>
      )}
    </div>
  );
};

export default DriveBrowser;
