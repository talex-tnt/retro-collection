import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

type Game = {
  id: number;
  name: string;
};

type GamesResponse = {
  results: Game[];
};

export const rawgApi = createApi({
  reducerPath: 'rawgApi',

  baseQuery: fetchBaseQuery({
    baseUrl: 'https://api.rawg.io/api',
  }),

  // 🔥 KEY PERFORMANCE SETTINGS
  keepUnusedDataFor: 300, // cache stays alive for 5 minutes
  refetchOnMountOrArgChange: false,
  refetchOnFocus: false,
  refetchOnReconnect: false,

  endpoints: (builder) => ({
    searchGames: builder.query<GamesResponse, string>({
      query: (search) => ({
        url: '/games',
        params: {
          key: import.meta.env.VITE_RAWG_API_KEY,
          search,
          page_size: 6,
        },
      }),

      // 🔥 prevents duplicate requests for same query
      serializeQueryArgs: ({ queryArgs }) => queryArgs.toLowerCase(),

      // 🔥 reuse previous result while fetching new identical ones
      merge: (currentCache, newData) => {
        currentCache.results = newData.results;
      },

      // 🔥 only refetch if query actually changes meaningfully
      forceRefetch({ currentArg, previousArg }) {
        return currentArg !== previousArg;
      },
    }),
  }),
});

export const { useSearchGamesQuery } = rawgApi;
