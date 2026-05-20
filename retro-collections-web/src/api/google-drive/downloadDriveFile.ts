import { getDriveToken, requestDriveToken } from './googleDriveAuth';

export const downloadDriveFile = async (fileId: string) => {
  let token = getDriveToken();

  if (!token) {
    token = await requestDriveToken();
  }

  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to download file');
  }

  return response.blob();
};
