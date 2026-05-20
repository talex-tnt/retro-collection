type DriveFile = {
  id: string;
  name: string;
  mimeType?: string;
};

export const findPreviewImage = (
  files: DriveFile[]
): { id: string; name: string; mimeType?: string } | undefined => {
  const previewNames = [
    'preview.png',
    'preview.jpg',
    'preview.jpeg',
    'cover.png',
    'cover.jpg',
    'cover.jpeg',
  ];

  const found = files.find((file) =>
    previewNames.includes(file.name.toLowerCase())
  );

  if (!found) return undefined;

  return {
    id: found.id,
    name: found.name,
    mimeType: found.mimeType,
  };
};
