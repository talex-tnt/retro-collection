type DriveFile = {
  id?: string;
  name?: string;
  mimeType?: string;
  thumbnailLink?: string;
};

export const findPreviewImage = (
  files: DriveFile[]
):
  | { id?: string; name?: string; mimeType?: string; thumbnailLink?: string }
  | undefined => {
  const previewNames = [
    'preview.png',
    'preview.jpg',
    'preview.jpeg',
    'cover.png',
    'cover.jpg',
    'cover.jpeg',
    'Preview.png',
    'Preview.jpg',
    'Preview.jpeg',
    'Cover.png',
    'Cover.jpg',
    'Cover.jpeg',
  ];

  const found = files.find(
    (file) => file.name && previewNames.includes(file.name.toLowerCase())
  );

  if (!found) return undefined;

  return {
    id: found.id,
    name: found.name,
    mimeType: found.mimeType,
    thumbnailLink: found.thumbnailLink,
  };
};
