import { useEffect, useState } from 'react';
import { downloadDriveFile } from '../api/google-drive/downloadDriveFile';

type Props = {
  fileId: string;
  name: string;
};

const DriveImage = ({ fileId, name }: Props) => {
  const [url, setUrl] = useState<string | null>(null);
  console.log('DriveImage component rendered with fileId:', fileId); // Debugging log for fileId
  useEffect(() => {
    let objectUrl: string;

    const load = async () => {
      try {
        const blob = await downloadDriveFile(fileId);

        objectUrl = URL.createObjectURL(blob);

        setUrl(objectUrl);
      } catch (err) {
        console.error(err);
      }
    };

    load();

    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
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
