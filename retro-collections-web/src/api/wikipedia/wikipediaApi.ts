import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

type WikiItem = {
  name: string;
  url: string;
};

type WikiResponse = [
  string, // search term
  string[], // titles
  string[], // descriptions
  string[], // urls
];

type WikipediaResponse = {
  results: WikiItem[];
};

export const wikipediaApi = createApi({
  reducerPath: 'wikipediaApi',
  baseQuery: fetchBaseQuery({
    baseUrl: 'https://en.wikipedia.org/w/api.php',
  }),
  endpoints: (builder) => ({
    search: builder.query<WikipediaResponse, string>({
      query: (search) => ({
        url: '',
        params: {
          action: 'opensearch',
          search,
          limit: 6,
          namespace: 0,
          format: 'json',
          origin: '*', // 🔥 REQUIRED for CORS
        },
      }),

      transformResponse: (response: WikiResponse): WikipediaResponse => {
        const [, titles, , urls] = response;
        console.log('Wikipedia API response:', response); // Debugging log for Wikipedia API response
        return {
          results: titles.map((title, i) => ({
            name: title,
            url: urls[i],
          })),
        };
      },
    }),
  }),
});

export const { useSearchQuery } = wikipediaApi;
