import { useState } from 'react';
import { useListFilesQuery } from '../api/google-drive/googleDriveApi';

type DriveBrowserProps = {
  onSelectFolder: (folder: { id: string; name: string }) => void;
};

const DriveBrowser = ({ onSelectFolder }: DriveBrowserProps) => {
  const [currentFolder, setCurrentFolder] = useState('root');

  const { data, isLoading } = useListFilesQuery({
    folderId: currentFolder,
  });

  const folders =
    data?.files?.filter(
      (f: { mimeType: string }) =>
        f.mimeType === 'application/vnd.google-apps.folder'
    ) || [];

  return (
    <div>
      <h3>Current folder: {currentFolder}</h3>

      {isLoading && <p>Loading...</p>}

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

      {currentFolder !== 'root' && (
        <button onClick={() => setCurrentFolder('root')}>⬅ Back</button>
      )}
    </div>
  );
};

export default DriveBrowser;
