import { useEffect, useState } from 'react';
import { downloadDriveFile } from '../api/google-drive/downloadDriveFile';

import {
  getMemoryBlob,
  setMemoryBlob,
  getMemoryUrl,
  setMemoryUrl,
  getDiskBlob,
  setDiskBlob,
} from '../utils/driveImageCache';

type Props = {
  fileId: string;
  name: string;
};

const DriveImage = ({ fileId, name }: Props) => {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string | undefined;

    const load = async () => {
      try {
        /* ---------------- 1. MEMORY URL ---------------- */
        const memoryUrl = getMemoryUrl(fileId);
        if (memoryUrl) {
          setUrl(memoryUrl);
          return;
        }

        /* ---------------- 2. MEMORY BLOB ---------------- */
        let blob = getMemoryBlob(fileId);

        if (!blob) {
          /* ---------------- 3. DISK CACHE ---------------- */
          blob = await getDiskBlob(fileId);

          /* ---------------- 4. NETWORK FALLBACK ---------------- */
          if (!blob) {
            blob = await downloadDriveFile(fileId);

            // save to disk cache
            await setDiskBlob(fileId, blob);
          }

          // save to memory cache
          setMemoryBlob(fileId, blob);
        }

        /* ---------------- CREATE OBJECT URL ---------------- */
        objectUrl = URL.createObjectURL(blob);

        setMemoryUrl(fileId, objectUrl);
        setUrl(objectUrl);
      } catch (err) {
        console.error(err);
      }
    };

    load();

    return () => {
      // IMPORTANT: DO NOT revoke here
      // (we reuse URLs from memory cache)
    };
  }, [fileId]);

  if (!url) {
    return <p>Loading...</p>;
  }

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

export default DriveImage;
