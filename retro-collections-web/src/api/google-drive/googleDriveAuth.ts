let tokenClient: google.accounts.oauth2.TokenClient | null = null;
let accessToken: string | null = null;

export const initGoogleDriveAuth = (clientId: string) => {
  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: clientId,
    scope: 'https://www.googleapis.com/auth/drive.readonly',
    callback: (response) => {
      accessToken = response.access_token;
    },
  });
};

export const requestDriveToken = (): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!tokenClient) {
      reject('Google Token Client not initialized');
      return;
    }

    tokenClient.callback = (response) => {
      accessToken = response.access_token;
      resolve(accessToken);
    };

    tokenClient.requestAccessToken({
      prompt: '', // silent when possible
    });
  });
};

export const getDriveToken = () => accessToken;
