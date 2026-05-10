import { configureStore } from '@reduxjs/toolkit';
import { firestoreApi } from '../api/firestore/firestoreApi';

export const store = configureStore({
  reducer: {
    [firestoreApi.reducerPath]: firestoreApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
        ignoredPaths: ['firestoreApi.queries'],
      },
    }).concat(firestoreApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
