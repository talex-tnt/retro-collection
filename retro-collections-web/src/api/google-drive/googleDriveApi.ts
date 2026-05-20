import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { getDriveToken, requestDriveToken } from './googleDriveAuth';

type ListFilesArgs = {
  folderId?: string;
  query?: string;
};

export const driveApi = createApi({
  reducerPath: 'driveApi',

  baseQuery: async (args, api, extraOptions) => {
    let token = getDriveToken();

    if (!token) {
      token = await requestDriveToken();
    }

    const base = fetchBaseQuery({
      baseUrl: 'https://www.googleapis.com/drive/v3',
      prepareHeaders: (headers) => {
        headers.set('Authorization', `Bearer ${token}`);
        return headers;
      },
    });

    const result = await base(args, api, extraOptions);

    // 🔄 auto retry on expired token
    if (result.error?.status === 401) {
      const newToken = await requestDriveToken();

      return fetchBaseQuery({
        baseUrl: 'https://www.googleapis.com/drive/v3',
        prepareHeaders: (headers) => {
          headers.set('Authorization', `Bearer ${newToken}`);
          return headers;
        },
      })(args, api, extraOptions);
    }

    return result;
  },
  endpoints: (builder) => ({
    listFiles: builder.query<any, ListFilesArgs>({
      query: ({ folderId, query }) => ({
        url: '/files',
        params: {
          q:
            query ??
            (folderId ? `'${folderId}' in parents` : "'root' in parents"),
          fields: 'files(id,name,mimeType)',
        },
      }),
    }),
    // listFiles: builder.query<any, { query?: string }>({
    //   query: ({ query }) => ({
    //     url: '/files',
    //     params: query
    //       ? {
    //           q: query,
    //           fields: 'files(id, name, mimeType, modifiedTime)',
    //         }
    //       : {
    //           fields: 'files(id, name, mimeType, modifiedTime)',
    //         },
    //   }),
    // }),

    getFile: builder.query<any, string>({
      query: (fileId) => `/files/${fileId}`,
    }),

    getFileDownload: builder.query<any, string>({
      query: (fileId) => ({
        url: `/files/${fileId}`,
        params: {
          alt: 'media',
        },
        responseHandler: async (response) => response.blob(),
      }),
    }),
  }),
});

export const { useListFilesQuery, useGetFileQuery, useGetFileDownloadQuery } =
  driveApi;
