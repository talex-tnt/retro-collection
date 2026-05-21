import { configureStore } from '@reduxjs/toolkit';
import { firestoreApi } from '../api/firestore/firestoreApi';
import { driveApi } from '../api/google-drive/googleDriveApi';
import { wikipediaApi } from '../api/wikipedia/wikipediaApi';
import authReducer from './authSlice';

export const store = configureStore({
  reducer: {
    [firestoreApi.reducerPath]: firestoreApi.reducer,
    [driveApi.reducerPath]: driveApi.reducer,
    [wikipediaApi.reducerPath]: wikipediaApi.reducer,
    auth: authReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
        ignoredPaths: ['firestoreApi.queries'],
      },
    })
      .concat(firestoreApi.middleware)
      .concat(driveApi.middleware)
      .concat(wikipediaApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
