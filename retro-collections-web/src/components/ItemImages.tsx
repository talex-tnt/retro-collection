import { useListFilesQuery } from '../api/google-drive/googleDriveApi';
import type { FileType, FolderType } from '../api/firestore/types/shared';
import DriveImage from './DriveImage';

type ItemImagesProps = {
  folder?: FolderType;
};

const ItemImages = ({ folder }: ItemImagesProps) => {
  const folderId = folder?.id;

  const { data, isLoading } = useListFilesQuery(
    {
      folderId: folderId || 'root',
    },
    {
      skip: !folderId, // don’t fetch if no folder
    }
  );

  const files = data?.files || [];

  const images: FileType[] = files.filter((f: FileType) =>
    f.mimeType?.startsWith('image/')
  );

  if (!folderId) {
    return <div className="text-xs opacity-60">No image folder selected.</div>;
  }

  return (
    <div className="mt-4">
      <h4 className="font-semibold text-sm mb-2">Images</h4>

      {isLoading && (
        <div className="flex items-center gap-2 my-2">
          <span className="loading loading-spinner loading-xs" />
          <span className="text-xs opacity-70">Loading images...</span>
        </div>
      )}

      {!isLoading && images.length === 0 && (
        <div className="text-xs opacity-60">No images in this folder.</div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {images.map((img) => (
          <div key={img.id} className="flex flex-col items-center">
            <div className="w-full h-[120px] bg-base-200 rounded overflow-hidden flex items-center justify-center">
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
  );
};

export default ItemImages;
