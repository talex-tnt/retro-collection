export type ImageFolder = {
  id?: string;
  name?: string;
};
export type ImagePreview = {
  id?: string;
  name?: string;
  mimeType?: string;
  thumbnailLink?: string;
};

export type FileType = ImageFolder & ImagePreview;
export type FolderType = ImageFolder & Partial<ImagePreview>;
