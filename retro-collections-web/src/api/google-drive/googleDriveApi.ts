import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

const BASE_URL = 'https://www.googleapis.com/drive/v3';

type ListFilesArgs = {
  folderId?: string;
  query?: string;
};

export const driveApi = createApi({
  reducerPath: 'driveApi',
  baseQuery: fetchBaseQuery({
    baseUrl: BASE_URL,
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as any).auth?.accessToken;

      if (token) {
        headers.set('authorization', `Bearer ${token}`);
      }

      return headers;
    },
  }),

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
